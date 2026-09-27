// ===================== pokemon_catch.js (포켓몬 포획 게임) =====================
// script.js(공용)/pokemon_pokedex.js/pokemon_learning.js 다음, pokemon_battle.js보다 먼저
// 로드되어야 함(배틀 프리뷰가 initGame()을 재사용). 구조는 MODULARIZATION_PLAN.md 참고.

const startBtn    = document.getElementById('start-btn');
const throwBtn    = document.getElementById('throw-btn');
const runawayBtn  = document.getElementById('runaway-btn');
const chargeBtn   = document.getElementById('charge-btn');
const startScreen = document.getElementById('start-screen');
const pokeball    = document.getElementById('pokeball');
const captureMessageEl = document.getElementById('capture-message');
const gameTimerEl = document.getElementById('game-timer');
const cpTotalEl   = document.getElementById('cp-total');

// 학습 데이터 업로드 / 시작 화면 요소
const resultScreen   = document.getElementById('result-screen');
const resultScoreEl  = document.getElementById('result-score');
const resultCorrectEl = document.getElementById('result-correct');
const resultWrongEl  = document.getElementById('result-wrong');
const resultHomeBtn  = document.getElementById('result-home-btn');
const retryBtn       = document.getElementById('retry-btn');
const capturedListBtn = document.getElementById('captured-list-btn');
const dexBtnResult    = document.getElementById('dex-btn-result');

// 포획한 포켓몬 목록 모달 요소
const capturedModal    = document.getElementById('captured-modal');
const capturedCloseBtn = document.getElementById('captured-close-btn');
const pauseModal       = document.getElementById('pause-modal');
const capturedListEl   = document.getElementById('captured-list');

// 배틀 뒷모습 프리뷰 요소 (선택 화면은 #dex-modal을 재사용 — 아래 도감 모달 요소 참고)
let pokeballCount = 1;
let runawayCount  = 1;

// 퀴즈 정답/오답 집계 (결과 화면에 표시)
let capturedList = [];

// 몬스터볼/도망치다 버튼이 애니메이션 진행 중인지 여부 (진행 중엔 개수와 무관하게 비활성화)
let isAnimating = false;

// 제한시간이 끝났는지 여부 (끝났어도 진행 중인 몬스터볼 애니메이션은 끝까지 보여준 뒤 결과 화면으로 전환)
let gameTimeUp = false;

// 상수
const THROW_DURATION          = 400;  // ms - 던지는 시간 (몬스터볼 패치: 새 throw.gif 8프레임×50ms에 맞춤. style.css의 #pokeball.throwing transition-duration과 반드시 함께 변경)
const BOUNCE_DURATION         = 525;  // ms - 충돌 후 정점까지 걸리는 시간 (기존 750 → 70%)
const OPEN_DELAY              = 210;  // ms - 충돌 후 open.gif 시작까지 딜레이 (기존 300 → 70%)
const CAPTURE_ABSORB_DURATION = 280;  // ms - 포획 흡수(.captured) CSS 트랜지션 시간 (기존 400 → 70%, 도망치다와는 별개)
const MONSTER_SHRINK_DURATION = 400;  // ms - 도망치다/새 몬스터 등장 시 몬스터 페이드 시간 (변경 없음)
const BOUNCE_PEAK_OFFSET      = 125; // px - ball-bounce 키프레임 이동거리 (CSS와 동일값 유지)
const DROP_DURATION           = 280;  // ms - 낙하 transition 시간 (기존 400 → 70%)
const LAND_DURATION           = 280;  // ms - 착지 바운스 animation 시간 (기존 400 → 70%)
const LANDED_WAIT             = 350;  // ms - 착지 후 onLanded 호출까지 대기 (기존 500 → 70%)
const ESCAPE_CALLBACK_WAIT    = 350;  // ms - 탈출 연출 후 콜백까지 대기 (기존 500 → 70%)
const ESCAPE_SPRING_DURATION  = 350;  // ms - 탈출 후 원래 크기로 복귀하는 스프링 트랜지션 (기존 500 → 70%)
const SHAKE_DURATION          = 450;  // ms - catch.gif 1회 재생 시간 (몬스터볼 패치: 새 catch.gif 9프레임×50ms에 맞춤)
const SHAKE_PAUSE             = 350;  // ms - 흔들림 사이 또는 탈출 전 대기 시간 (기존 500 → 70%)
const CAPTURE_CHAR_DELAY      = 42;   // ms - 포획 메시지 한 글자당 타이핑 속도 (기존 60 → 70%)
const CAPTURE_MESSAGE_WAIT    = 1000; // ms - 메시지 완성 후 다음 몬스터로 넘어가기까지 대기 시간

if (dexBtnResult) dexBtnResult.addEventListener('click', openDexModalNormal);

// 몬스터 등장 카테고리 확률 (합 1.0)
const CATEGORY_RATE = { gmax: 0.005, mega: 0.025, normal: 0.97 };

const SHINY_CHANCE         = 0.1;   // 10% 확률로 shiny 등장 (카테고리와 무관하게 독립 적용)

// CP(점수 표시용) 배율 — pokemon_data.js의 bst는 항상 "진짜" 종족값(mega/gmax도 자기 기본종과
// 동일)만 저장하고, 카테고리/이로치에 따른 점수 보정은 전부 여기서 곱셈으로만 적용함(포획 확률·
// 실패 모션 계산에는 이 배율들을 절대 안 섞고 항상 원본 bst만 씀 — getCatchProbability/
// pickFailType 쪽 currentBst 참고). 서로 곱연산이라 이로치 메가/거다이맥스는 두 배율이 같이 적용됨.
const SHINY_CP_MULTIPLIER  = 1.5;   // 이로치 포획 시 점수(CP) 배율. 카테고리 상관없이 통일
const MEGA_CP_MULTIPLIER   = 2;     // 메가진화 포획 시 점수(CP) 배율
const GMAX_CP_MULTIPLIER   = 3;     // 거다이맥스 포획 시 점수(CP) 배율

// 카테고리 배율 × 이로치 배율을 곱해서 최종 CP 표시 배율을 구하는 공용 함수(script.js보다
// 늦게 로드되지만 pokemon_catch.js가 pokemon_battle.js보다 먼저 로드되므로 양쪽에서 재사용 가능).
function getCpMultiplier(category, isShiny) {
    const categoryMult = category === 'mega' ? MEGA_CP_MULTIPLIER
        : category === 'gmax' ? GMAX_CP_MULTIPLIER
        : 1;
    return categoryMult * (isShiny ? SHINY_CP_MULTIPLIER : 1);
}

// 아래 두 경로(몬스터볼 open/catch)는 프리로드와 실제 재생 양쪽에서 항상 같은 문자열을 쓰도록
// 상수로 관리. 쿼리스트링을 붙이지 않아야 브라우저 캐시가 재사용됨 (재생 직전 항상 다른 src가
// 이미 들어있는 흐름이라, 쿼리스트링 없이도 브라우저가 알아서 처음부터 다시 재생해줌)
const POKEBALL_OPEN_SRC  = 'images/pokemon/pokeball/open.gif';
const POKEBALL_CATCH_SRC = 'images/pokemon/pokeball/catch.gif';

const CATCH_PROB_MAX  = 0.9;   // 종족값 최저(normal) 몬스터의 포획 성공률 (지수함수 곡선의 이론적 상한 참고값)
const CATCH_PROB_MIN  = 0.10;  // 종족값 최고(normal) 몬스터의 포획 성공률 (지수함수 곡선의 이론적 하한 참고값)
const CATCH_PROB_RARE = 0.10;  // 메가/거다이맥스 전용 고정 포획 성공률 (normal 최고와 동일)

// 포획률패치: 일반 포켓몬 포획 확률을 선형 보간 대신 지수함수로 변경.
// 세 지점을 정확히 지나도록 피팅한 계수(BST 175→90%, 500→30%, 770→10%):
//   prob(bst) = CATCH_EXP_C + CATCH_EXP_A * exp(-CATCH_EXP_K * bst)
const CATCH_EXP_A = 1.6276185420670406;
const CATCH_EXP_K = 0.003028144951451861;
const CATCH_EXP_C = -0.058095865976901084;

// 현재 라운드 몬스터의 종족값 / 이름 / 번호(id) (포획 확률·실패 모션 결정, 포획 메시지·목록에 사용)
let currentBst = 0;          // 원본 종족값 (포획 확률/실패 모션 계산 전용)
let currentEffectiveBst = 0; // 표시/점수 계산용 값 (shiny면 1.5배)
let currentCategory = 'normal'; // 'normal' / 'mega' / 'gmax'
let currentMonsterName = '';
let currentMonsterId = '';
let currentIsShiny = false;

// ===================== 제한시간 타이머 / 포획 CP 합계 =====================
const TIME_LIMIT_SECONDS = 300; // 게임 제한시간: 5분(300초)

let remainingSeconds  = TIME_LIMIT_SECONDS;
let timerIntervalId   = null;
let totalCapturedCp   = 0; // 지금까지 포획한 몬스터들의 종족값(CP) 합계

// 초 단위 정수를 "mm:ss" 형태로 표시
function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// CP 합계를 k 단위(소수 첫째자리)로 표시 (예: 1234 → "1.2k")
function updateTimerDisplay() {
    gameTimerEl.textContent = formatTime(Math.max(remainingSeconds, 0));
}

function updateCpTotalDisplay() {
    cpTotalEl.textContent = formatCpTotal(totalCapturedCp);
}

// 게임 시작 시 호출: 타이머/CP 합계 초기화 후 1초마다 카운트다운
function startGameTimer() {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
    remainingSeconds = TIME_LIMIT_SECONDS;
    updateTimerDisplay();
    resumeGameTimer();
}

// 타이머만 멈춤 (일시정지 화면 / 포획한 포켓몬 화면을 게임 중 열었을 때 사용)
function pauseGameTimer() {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
}

// 멈췄던 타이머를 남은 시간 그대로 이어서 재개
function resumeGameTimer() {
    if (timerIntervalId || gameTimeUp) return; // 이미 돌고 있거나 게임이 끝난 상태면 무시
    timerIntervalId = setInterval(() => {
        remainingSeconds--;
        updateTimerDisplay();
        if (remainingSeconds <= 0) {
            clearInterval(timerIntervalId);
            timerIntervalId = null;
            onTimeUp();
        }
    }, 1000);
}

// 제한시간 종료: 몬스터볼을 던지는 중이면 그 애니메이션이 끝날 때까지 기다렸다가 결과 화면으로 전환
// (끝나기 직전에 던진 몬스터볼은 포획 성공/실패와 무관하게 끝까지 보여주고, 포획 성공 시엔 결과에 반영)
function onTimeUp() {
    gameTimeUp = true;
    quizModal.classList.add('hidden'); // 퀴즈는 더 이상 풀 수 없으므로 즉시 닫음

    if (!isAnimating) {
        // 진행 중인 애니메이션이 없으면 바로 결과 화면으로 전환
        finishGameToResult();
    }
    // isAnimating이 true인 경우(몬스터볼 던지는 중 / 도망치는 중)엔 여기서 아무것도 하지 않고,
    // 해당 애니메이션이 자연스럽게 끝나는 지점(runThrow/runRunAway 내부)에서
    // gameTimeUp 플래그를 감지해 자동으로 결과 화면으로 전환됨
}

// 실제로 게임을 종료 상태로 만들고 결과 화면을 표시
function finishGameToResult() {
    isAnimating = true; // 몬스터볼/도망치다/충전하기 버튼 모두 비활성화
    refreshButtons();
    quizModal.classList.add('hidden');

    captureMessageEl.classList.add('hidden');
    captureMessageEl.textContent = '';

    // 포획 성공 처리 도중(onCaptureSuccess) 시간이 끝나 여기로 바로 넘어온 경우,
    // 버튼에 남아있을 수 있는 btn-hidden(투명 처리)을 정리해 다음 게임 시작 시 정상적으로 보이도록 함
    [throwBtn, runawayBtn, chargeBtn].forEach(b => b.classList.remove('btn-hidden'));

    showResultScreen();
}

// 결과 화면 표시: 게임 화면 요소를 숨기고 대기창 스타일의 결과창(점수/정답/오답 + 다시하기/포획목록)을 보여줌
function showResultScreen() {
    resultScoreEl.textContent   = `🏆 점수 : ${formatCpTotal(totalCapturedCp)}점`;
    resultCorrectEl.textContent = `⭕ 정답 : ${quizCorrectCount}개`;
    resultWrongEl.textContent   = `❌ 오답 : ${quizWrongCount}개`;

    // 게임 플레이 요소 숨김
    monster.classList.add('hidden');
    shinyEffect.classList.add('hidden');
    monsterInfo.classList.add('hidden');
    monsterInfoText.classList.add('hidden');
    gameTimerEl.classList.add('hidden');
    cpTotalEl.classList.add('hidden');
    pokeball.classList.add('hidden');
    controlPanel.classList.add('hidden');

    resultScreen.classList.remove('hidden');
}

// 종족값이 높을수록 포획 성공률이 지수적으로 낮아짐 (175→90%, 500→30%, 770→10%).
// 메가/거다이맥스는 항상 고정값(normal 최고와 동일)
function getCatchProbability(bst, category) {
    if (category === 'mega' || category === 'gmax') return CATCH_PROB_RARE;
    return CATCH_EXP_C + CATCH_EXP_A * Math.exp(-CATCH_EXP_K * bst);
}

// 포획 확률 곡선에서 "얼마나 어려운 위치인지"를 0(가장 쉬움)~1(가장 어려움)로 환산.
// 종족값을 직접 쓰지 않고 포획확률 기반으로 계산해서, 실패 유형 비율도 지수함수의
// 굴곡(초반에 빠르게 어려워지는 모양)을 그대로 반영하도록 함
function getFailTypeProgress(bst) {
    const prob = getCatchProbability(bst, 'normal');
    return (CATCH_PROB_MAX - prob) / (CATCH_PROB_MAX - CATCH_PROB_MIN);
}

// 종족값이 높을수록(정확히는 포획확률 기반 진행도가 높을수록) 실패 모션 1(무저항 탈출)이
// 잦고, 3(가장 오래 저항)은 드물어짐. 메가/거다이맥스는 t=1(난이도 최상단) 고정
function pickFailType(bst, category) {
    const t = (category === 'mega' || category === 'gmax')
        ? 1
        : getFailTypeProgress(bst);
    // 해너츠(CP 최저, t=0): 실패1/2/3 = 20/30/50
    // 아르세우스(CP 최고, t=1): 실패1/2/3 = 50/30/20 (같은 세 숫자를 반대로 배정)
    const w1 = 0.2 + 0.3 * t;  // 20% ~ 50% (무저항 탈출, 어려울수록 ↑)
    const w3 = 0.5 - 0.3 * t;  // 50% ~ 20% (오래 저항, 쉬울수록 ↑)
    const w2 = 1 - w1 - w3;    // 항상 30% (양 끝 값이 같아 기울기가 상쇄됨)
    const r = Math.random();
    if (r < w1) return 1;
    if (r < w1 + w2) return 2;
    return 3;
}

// 카테고리별 스프라이트 폴더 (9세대 확장분은 정지 PNG 스프라이트시트 — animateSpriteSheet 참고)
const ICON_FOLDER = {
    normal: { base: 'icon',      shiny: 'icon_shiny' },
    mega:   { base: 'icon_mega', shiny: 'icon_mega_shiny' },
    gmax:   { base: 'icon_gmax', shiny: 'icon_gmax_shiny' },
};

function capturedIconSrc(id, category, isShiny) {
    const folders = ICON_FOLDER[category] || ICON_FOLDER.normal;
    const folder = isShiny ? folders.shiny : folders.base;
    return `${SPRITE9_ROOT}/${folder}/${id}.png`;
}

// 배틀 화면에 쓰는 뒷모습(back) 스프라이트 경로. 뒷모습 자료는 폼 차이(지역폼/코스튬/성별)까지
// 구분해서 구할 수 없어 "일반(normal)" 카테고리는 항상 기본 폼(species) 뒷모습으로 대체함.
// 메가/거다이맥스는 정확한 id로 시도하되, 뒷모습이 없으면 <img onerror>에서 기본 폼으로 폴백함.
function pickCategory() {
    const r = Math.random();
    if (r < CATEGORY_RATE.gmax) return 'gmax';
    if (r < CATEGORY_RATE.gmax + CATEGORY_RATE.mega) return 'mega';
    return 'normal';
}

function pickRandomMonster() {
    const category = pickCategory();
    let id;
    if (category === 'normal') {
        const species = NORMAL_SPECIES_LIST[Math.floor(Math.random() * NORMAL_SPECIES_LIST.length)];
        const forms = NORMAL_BY_SPECIES[species];
        id = forms[Math.floor(Math.random() * forms.length)];
    } else if (category === 'mega') {
        id = MEGA_IDS[Math.floor(Math.random() * MEGA_IDS.length)];
    } else {
        id = GMAX_IDS[Math.floor(Math.random() * GMAX_IDS.length)];
    }

    const isShiny = Math.random() < SHINY_CHANCE;
    const info = POKEMON_DATA[id] || { name: '???', bst: 0, category: 'normal' };
    // bst: 포획 확률/실패 모션 계산에 쓰이는 원본 종족값 (shiny 여부와 무관하게 항상 동일)
    // effectiveBst: 표시/점수 계산에 쓰이는 값 (getCpMultiplier로 카테고리×이로치 배율 적용)
    const effectiveBst = info.bst * getCpMultiplier(category, isShiny);
    return {
        id, category,
        src: frontSpriteSrc(id, isShiny),
        isShiny, name: info.name, bst: info.bst, effectiveBst
    };
}

// 이미지를 미리 요청해 캐시에 올리고, 로딩이 끝나거나 최대 PRELOAD_TIMEOUT_MS(1초)가 지나면
// resolve되는 Promise를 반환함 — 온라인 배포 환경에서 네트워크 지연으로 몬스터 이미지가
// hp바/텍스트보다 늦게 나타나는 현상을 줄이기 위함(느린 네트워크에서도 최대 1초에서 끊고 넘어감).
function resetPokeball() {
    pokeball.src = 'images/pokemon/pokeball/1.png';
    pokeball.style.transition = 'none';
    pokeball.classList.remove('throwing', 'dropped', 'bouncing', 'landing');
    pokeball.style.bottom = '';
    void pokeball.offsetHeight;
    pokeball.style.transition = '';
}

// 몬스터×N / 도망치다×N 버튼 라벨과 활성/비활성 상태를 현재 보유 개수 및 애니메이션 상태에 맞게 갱신
function refreshButtons() {
    throwBtn.textContent   = `몬스터볼×${pokeballCount}`;
    runawayBtn.textContent = `도망치다×${runawayCount}`;
    throwBtn.disabled   = isAnimating || pokeballCount <= 0;
    runawayBtn.disabled = isAnimating || runawayCount  <= 0;
    chargeBtn.disabled  = isAnimating || wordList.length < QUIZ_MIN_WORDS;
    // 터치 반응 통일 패치: game-timer/cp-total도 <button>으로 전환해서 나머지 3개 버튼과
    // 완전히 동일한 방식(disabled 속성 + :disabled 룩)으로 통일함
    gameTimerEl.disabled = isAnimating;
    cpTotalEl.disabled   = isAnimating;
}

// 게임 초기화. preselected가 있으면(프리로드해둔 다음 몬스터) 그대로 쓰고, 없으면 새로 랜덤 선택.
// onSpriteReady: 스프라이트 크기 계산이 끝난 뒤(displayMonsterSprite의 onReady) 실행할 선택적
// 콜백 — 배틀 프리뷰가 몬스터 위치를 hp바에 맞춰 재조정하는 용도로만 쓰며, 실제 포획 게임
// (startGame → initGame())은 이 인자 없이 호출되어 동작이 달라지지 않음.
function initGame(preselected, onSpriteReady) {
    isAnimating = false;
    refreshButtons();

    // 이번 라운드 몬스터 결정 (시작 시엔 새로 랜덤 선택, 포획 후엔 미리 프리로드해둔 몬스터 재사용)
    const picked = preselected || pickRandomMonster();
    // 이전 라운드에서 남아있을 수 있는 shiny 이펙트 정리 (재생 중이었다면 타이머도 같이 정지)
    stopShinyAnimation();
    shinyEffect.classList.add('hidden');
    // #shiny-effect는 #monster 밖의 독립 요소(베타와 동일 구조)라 부모 페이드인의 영향을 안 받음.
    // 다만 크기(몬스터 비례)를 정확히 맞추려면 #monster-sprite의 크기 계산이 끝난 뒤(onReady)에
    // 재생해야 함 — 동기적으로 바로 부르면 아직 계산 전이라 기본값을 읽게 됨
    displayMonsterSprite(monster, picked.src, picked.id, () => {
        // onSpriteReady(배틀 프리뷰의 alignWildMonsterTopToHpBar)가 #monster의 최종 위치를
        // 먼저 확정해야, 그 위치를 읽는 playShinyEffect()가 정확한 좌표로 이펙트를 그림 —
        // 순서가 바뀌면 이전 라운드의 낡은 위치를 읽어 이펙트가 엉뚱한 곳에 나타남
        if (onSpriteReady) onSpriteReady(picked);
        if (picked.isShiny) playShinyEffect();
    });
    updateMonsterInfo(picked);

    // 몬스터 + hp바를 투명한 상태로 초기화한 뒤, 도망치기와 동일한 페이드인 효과로 나타나게 함
    monster.classList.remove('captured', 'hidden');
    monster.style.transition = 'none';
    monster.style.transform  = '';
    monster.style.opacity    = '0';
    monsterInfo.style.transition = 'none';
    monsterInfoText.style.transition = 'none';
    monsterInfo.style.opacity    = '0';
    monsterInfoText.style.opacity    = '0';
    void monster.offsetHeight;
    monster.style.transition = '';
    monster.style.opacity    = '1';
    monsterInfo.style.transition = '';
    monsterInfoText.style.transition = '';
    monsterInfo.style.opacity    = '1';
    monsterInfoText.style.opacity    = '1';

    setTimeout(() => {
        monster.style.opacity = '';
        monsterInfo.style.opacity = '';
        monsterInfoText.style.opacity = '';
    }, MONSTER_SHRINK_DURATION);

    // 포켓볼 상태 초기화
    resetPokeball();
}

// 몬스터 탈출 연출 — 착지한 공의 실제 중심에서 원래 위치로 커지며 나타남
function escapeMonster() {
    const containerRect  = gameContainer.getBoundingClientRect();
    const monsterRect    = monster.getBoundingClientRect();
    const ballRect       = pokeball.getBoundingClientRect();

    const monsterCenterY = (monsterRect.top - containerRect.top) + monsterRect.height / 2;
    const ballCenterY    = (ballRect.top    - containerRect.top) + ballRect.height  / 2;
    // getBoundingClientRect()는 화면 좌표(스케일 적용됨)라서, transform(로컬 좌표)에 쓰려면
    // currentScale로 나눠 환산해야 반응형 스케일링 상태에서도 정확한 위치에서 시작함
    const offsetY = (ballCenterY - monsterCenterY) / currentScale;

    // 공 중심(작고 투명)에서 즉시 시작
    monster.style.transition = 'none';
    monster.style.opacity    = '0';
    monster.style.transform  = `translateX(-50%) translateY(${offsetY}px) scale(0.05)`;
    monster.classList.remove('captured');
    void monster.offsetHeight;

    // 원래 위치로 커지며 나타남 (스프링 커브)
    monster.style.transition = `opacity ${ESCAPE_SPRING_DURATION}ms ease-out, transform ${ESCAPE_SPRING_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    monster.style.opacity    = '';
    monster.style.transform  = '';
}

// 탈출 연출 — open.gif 시작과 동시에 몬스터 탈출, 500ms 후 콜백
function openAndEscape(callback) {
    pokeball.src = POKEBALL_OPEN_SRC; // 루프 없는 gif, 마지막 프레임에서 자동 정지. 직전엔 항상 다른 src(리셋된 1.png 등)라 캐시 재사용하며 처음부터 재생됨
    escapeMonster();
    setTimeout(() => { if (callback) callback(); }, ESCAPE_CALLBACK_WAIT);
}

// 공통 포획 모션 (던지기 → 착지 완료). 착지 후 0.5초 대기 후 onLanded() 호출
function runCapture(onLanded) {
    isAnimating = true;
    refreshButtons();

    // 1. 던지기
    pokeball.src = 'images/pokemon/pokeball/throw.gif';
    pokeball.style.bottom = getThrowTargetBottom() + 'px';
    pokeball.classList.add('throwing');

    setTimeout(() => {
        // 2. 충돌 & 튕기기
        pokeball.classList.add('bouncing');

        // 올라가는 도중 열리기 (루프 없는 gif라 마지막 프레임에서 자동 정지)
        setTimeout(() => {
            pokeball.src = POKEBALL_OPEN_SRC;
        }, OPEN_DELAY);

        // 정점에서 몬스터 흡수 시작
        setTimeout(() => {
            monster.classList.add('captured');

            // 몬스터 흡수 완료 후 낙하
            setTimeout(() => {
                // 정점 위치(transform offset)를 실제 bottom 값으로 전환해 끊김 없이 낙하
                const peakBottom = parseFloat(pokeball.style.bottom) + BOUNCE_PEAK_OFFSET;
                pokeball.style.transition = 'none';
                pokeball.classList.remove('bouncing');
                pokeball.style.bottom = peakBottom + 'px';
                void pokeball.offsetHeight;
                pokeball.style.transition = '';
                pokeball.src = 'images/pokemon/pokeball/1.png';
                pokeball.classList.add('dropped');

                // 착지
                setTimeout(() => {
                    pokeball.classList.add('landing');

                    setTimeout(() => {
                        pokeball.classList.remove('landing');
                        setTimeout(onLanded, LANDED_WAIT); // 착지 후 대기
                    }, LAND_DURATION);

                }, DROP_DURATION);

            }, CAPTURE_ABSORB_DURATION);

        }, BOUNCE_DURATION);

    }, THROW_DURATION);
}

// 흔들기 N회 후 콜백 (각 흔들림 사이 SHAKE_PAUSE 대기)
function shakeN(count, onDone) {
    if (count === 0) { onDone(); return; }
    pokeball.src = POKEBALL_CATCH_SRC; // 직전엔 항상 1.png로 리셋되어 있어 캐시 재사용하며 처음부터 재생됨
    setTimeout(() => {
        pokeball.src = 'images/pokemon/pokeball/1.png';
        if (count > 1) {
            setTimeout(() => shakeN(count - 1, onDone), SHAKE_PAUSE);
        } else {
            onDone();
        }
    }, SHAKE_DURATION);
}

// 텍스트를 한 글자씩 타이핑해서 표시 (완료되면 onDone 호출)
function onCaptureSuccess() {
    [throwBtn, runawayBtn, chargeBtn].forEach(b => b.classList.add('btn-hidden'));

    totalCapturedCp += currentEffectiveBst;
    updateCpTotalDisplay();

    // 포획한 순서대로 목록에 기록 (포획한 포켓몬 모달에 사용, CP는 shiny 2배가 반영된 값)
    capturedList.push({ id: currentMonsterId, name: currentMonsterName, bst: currentEffectiveBst, isShiny: currentIsShiny, category: currentCategory });

    // 도감 등록: 이번 판 한정인 capturedList와 별개로, 브라우저에 계속 누적되는 전국도감에도 기록
    registerDexCatch(currentMonsterId, currentIsShiny);

    // 아이콘프리로드패치: 도감 목록을 열 때 여러 아이콘이 한꺼번에 몰려서(브라우저 동시 요청 제한
    // 약 6개) 대기 줄이 생기는 것을 막기 위해, 포획하는 순간마다 하나씩 분산해서 미리 받아둠
    preloadImage(capturedIconSrc(currentMonsterId, currentCategory, currentIsShiny));

    // 다음 몬스터를 미리 뽑아 포획 메시지가 보이는 동안(타이핑+대기, 1.6~1.8초) 이미지를 미리
    // 로드해둠 → initGame 표시 시점엔 이미 로딩이 끝나 hp바/텍스트와 동시에 나타남. 느린 네트워크
    // 등 예외 상황을 위해 initGame 호출 직전에 한 번 더 확실히 기다림.
    const nextMonster = pickRandomMonster();
    const preloadPromise = preloadImage(nextMonster.src);

    const message = `신난다!\n${currentMonsterName}을(를) 잡았다`;
    typeMessage(captureMessageEl, message, CAPTURE_CHAR_DELAY, () => {
        setTimeout(() => {
            captureMessageEl.classList.add('hidden');
            captureMessageEl.textContent = '';

            if (gameTimeUp) {
                // 시간이 끝나기 직전에 던진 몬스터볼이었음 — 포획 성공은 이미 위에서 CP/목록에 반영되었으니
                // 새 몬스터로 넘어가지 않고 바로 결과 화면으로 전환
                finishGameToResult();
                return;
            }

            preloadPromise.then(() => {
                initGame(nextMonster); // 프리로드해둔 몬스터로 교체 (액션창은 계속 유지되어 있었음, initGame이 라벨/버튼상태도 갱신)
                [throwBtn, runawayBtn, chargeBtn].forEach(b => b.classList.remove('btn-hidden'));
            });
        }, CAPTURE_MESSAGE_WAIT);
    });
}

// 실패 시 버튼만 다시 활성화 (몬스터는 바뀌지 않고 계속 도전 가능)
function reenableButtons() {
    isAnimating = false;
    refreshButtons();
}

// 몬스터볼 던지기: 종족값 기반 확률로 성공/실패 결정
// - 성공: 흔들림 3회 후 포획 메시지를 타이핑으로 표시, 2초 뒤 새 몬스터로 교체
// - 실패: 종족값이 높을수록 실패모션 1(무저항)이 잦고 3(장시간 저항)은 드묾, 탈출 후 같은 몬스터로 재도전 가능
function runThrow() {
    if (pokeballCount <= 0 || isAnimating) return;
    pokeballCount--;
    refreshButtons();

    runCapture(() => {
        const success = Math.random() < getCatchProbability(currentBst, currentCategory);

        if (success) {
            shakeN(3, onCaptureSuccess);
            return;
        }

        const failType = pickFailType(currentBst, currentCategory); // 1, 2, 3
        const shakeCount = failType - 1;            // 1→0회, 2→1회, 3→2회
        shakeN(shakeCount, () => {
            setTimeout(() => openAndEscape(() => {
                if (gameTimeUp) {
                    // 시간이 끝나기 직전에 던진 몬스터볼이 실패로 끝난 경우 — 탈출 연출까지 다 보여준 뒤 결과 화면으로 전환
                    resetPokeball();  // 결과 화면으로 넘어가기 전에 공도 정상적으로 리셋(정상 흐름과 동일하게 처리)
                    finishGameToResult();
                    return;
                }
                resetPokeball();   // 다시 던지기 전 상태로 복귀
                monster.style.transition = '';  // escapeMonster()가 남긴 인라인 transition 정리 —
                                                 // 다음 포획 성공 시 .captured의 정식 트랜지션(0.28s ease-in)이 정상 적용되도록
                reenableButtons();
            }), SHAKE_PAUSE);
        });
    });
}

// 몬스터 정중앙 타겟 bottom 값 계산. getBoundingClientRect()는 스케일 적용된 화면 좌표를
// 반환하지만 style.bottom은 스케일 적용 전 로컬 좌표계라 currentScale로 나눠 환산해야
// 반응형 스케일링 상태에서도 몬스터볼이 정확한 위치로 날아감.
function getThrowTargetBottom() {
    const containerRect  = gameContainer.getBoundingClientRect();
    const monsterRect    = monster.getBoundingClientRect();
    const monsterCenterY = (monsterRect.top - containerRect.top) + monsterRect.height / 2;
    const screenSpaceBottom = containerRect.height - monsterCenterY;
    return screenSpaceBottom / currentScale - pokeball.offsetHeight / 2;
}

// 도망가기: 현재 몬스터가 사라졌다가 다른 몬스터로 바뀌어 다시 나타남
function runRunAway() {
    if (runawayCount <= 0 || isAnimating) return;
    runawayCount--;
    isAnimating = true;
    refreshButtons();

    // 다음 몬스터를 미리 뽑아서 페이드아웃 구간(약 400ms) 동안 이미지 로딩을 시작해둠.
    // 실제로 다 받아질 때까지(또는 최대 PRELOAD_TIMEOUT_MS까지) 기다렸다가 교체하므로,
    // 이미지 용량이 커도 화면이 끊기거나 깨진 채로 나타나지 않음.
    const picked = pickRandomMonster();
    const preloadPromise = preloadImage(picked.src);

    // 1. 페이드아웃 (CSS #monster / #monster-info 모두 동일한 opacity transition 사용)
    monster.style.opacity = '0';
    monsterInfo.style.opacity = '0';
    monsterInfoText.style.opacity = '0';

    const fadeOutPromise = new Promise(resolve => setTimeout(resolve, MONSTER_SHRINK_DURATION));

    // 페이드아웃 연출이 끝나는 것과 이미지 로딩이 끝나는 것, 둘 다 완료된 뒤에 교체
    // (로딩이 페이드아웃보다 빨리 끝나면 지금과 동일하게 400ms 뒤 바로 교체됨)
    Promise.all([fadeOutPromise, preloadPromise]).then(() => {
        // 2. 안 보이는 상태에서 다른 몬스터로 교체 (이미 로딩이 끝난 상태라 지연 없이 표시됨)
        // 이전 shiny 이펙트 정리 (재생 중이었다면 타이머도 같이 정지)
        stopShinyAnimation();
        shinyEffect.classList.add('hidden');
        // 샤이니 패치: 크기 계산 완료(onReady) 이후에 재생 (#shiny-effect는 독립 요소라 지연 없이 즉시 재생)
        displayMonsterSprite(monster, picked.src, picked.id, () => {
            if (picked.isShiny) playShinyEffect();
        });
        updateMonsterInfo(picked);


        // 3. 페이드인 (몬스터 + hp바 동시에)
        monster.style.opacity = '1';
        monsterInfo.style.opacity = '1';
        monsterInfoText.style.opacity = '1';

        setTimeout(() => {
            monster.style.opacity = '';
            monsterInfo.style.opacity = '';
            monsterInfoText.style.opacity = '';

            if (gameTimeUp) {
                // 도망치는 도중 시간이 끝난 경우 — 연출까지 다 보여준 뒤 결과 화면으로 전환
                finishGameToResult();
                return;
            }

            isAnimating = false;
            refreshButtons();
        }, MONSTER_SHRINK_DURATION);

    });
}

// ===================== 학습 데이터 업로드 (엑셀: A열 영어 / B열 한글뜻) =====================

// 정답/오답 시 몬스터볼/도망치다를 증감시키는 건 포획 게임만의 규칙이라 pokemon_learning.js에는
// 없고 여기서 콜백으로 등록함 — 다른 파일이 같은 퀴즈를 다른 용도로 쓰려면 자기만의 콜백만
// 등록하면 됨(pokemon_learning.js는 그대로 두고 등록만 추가).
setQuizAnswerHandlers(
    () => {
        quizFeedback.textContent = '정답! 몬스터볼×1, 도망치다×1 획득!';
        pokeballCount++;
        runawayCount++;
        refreshButtons();
    },
    () => {
        quizFeedback.textContent = '오답! 몬스터볼×1, 도망치다×1 차감!';
        // 오답 패널티 패치: 정답 보상(+1/+1)과 대칭으로 -1/-1. 0 밑으로는 안 내려가게 클램프
        // (app.js의 modifyGems()가 보석 차감할 때 쓰는 것과 동일한 관례)
        pokeballCount = Math.max(0, pokeballCount - 1);
        runawayCount  = Math.max(0, runawayCount - 1);
        refreshButtons();
    }
);

chargeBtn.addEventListener('click', () => {
    if (wordList.length < QUIZ_MIN_WORDS) return;
    quizModal.classList.remove('hidden');
    // 이전에 닫기(×)로 나가서 아직 못 푼 문제가 있으면 새 문제 대신 그 문제를 이어서 보여줌
    if (currentQuiz && !quizAnswered) {
        renderQuiz();
    } else {
        pickQuizQuestion();
    }
});

function startGame() {
    if (wordList.length < QUIZ_MIN_WORDS) return;

    pokeballCount = 1;
    runawayCount  = 1;
    quizCorrectCount = 0;
    quizWrongCount   = 0;
    capturedList     = [];
    gameTimeUp       = false;
    capturedModalOpenedDuringGame = false;
    pauseModal.classList.add('hidden');
    capturedModal.classList.add('hidden');

    startScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');

    // 결과 화면 표시 중 숨겨뒀던 게임 요소 복원 (다시하기 시 필요, 최초 시작 시엔 이미 보이는 상태라 영향 없음)
    pokeball.classList.remove('hidden');
    controlPanel.classList.remove('hidden');

    // 시간 종료 직전 포획 성공(onCaptureSuccess)이 btn-hidden을 지우지 못하고 끝난 경우를 대비한 안전장치
    [throwBtn, runawayBtn, chargeBtn].forEach(b => b.classList.remove('btn-hidden'));

    initGame();

    totalCapturedCp = 0;
    updateCpTotalDisplay();
    gameTimerEl.classList.remove('hidden');
    cpTotalEl.classList.remove('hidden');
    startGameTimer();
}

// 포획한 포켓몬 목록을 포획한 순서대로 아이콘 + 이름 + CP로 렌더링
function renderCapturedList() {
    capturedListEl.innerHTML = '';

    if (capturedList.length === 0) {
        const empty = document.createElement('div');
        empty.id = 'captured-empty';
        empty.textContent = '아직 포획한 포켓몬이 없습니다';
        capturedListEl.appendChild(empty);
        return;
    }

    // 같은 포켓몬(id)끼리 묶되, 일반 개체와 shiny는 항상 별도 그룹으로 분리
    const groups = new Map(); // key: "id_isShiny" -> { id, name, bst, isShiny, category, count }
    capturedList.forEach(mon => {
        const key = `${mon.id}_${mon.isShiny}`;
        if (!groups.has(key)) {
            groups.set(key, { id: mon.id, name: mon.name, bst: mon.bst, isShiny: mon.isShiny, category: mon.category, count: 0 });
        }
        groups.get(key).count++;
    });

    // CP 높은 순으로 정렬해서 표시
    const sortedGroups = Array.from(groups.values()).sort((a, b) => b.bst - a.bst);

    sortedGroups.forEach(group => {
        const row = document.createElement('div');
        row.className = 'captured-row';

        const icon = document.createElement('div');
        icon.className = 'captured-icon';
        // 9세대 확장분 아이콘은 가로 2프레임(128x64, 각 64x64)짜리 스프라이트시트라서
        // <img>로는 통째로 눌려 보임 — background-image로 첫 프레임(왼쪽 절반)만 잘라서 표시
        icon.style.backgroundImage = `url(${capturedIconSrc(group.id, group.category, group.isShiny)})`;
        icon.style.backgroundSize = '200% 100%';
        icon.style.backgroundPosition = '0 0';
        icon.style.backgroundRepeat = 'no-repeat';
        icon.title = group.name;

        const name = document.createElement('span');
        name.className = 'captured-name';
        const baseName = group.isShiny ? `${group.name}✨` : group.name;
        name.textContent = group.count > 1 ? `${baseName} ×${group.count}` : baseName;

        const cp = document.createElement('span');
        cp.className = 'captured-cp';
        cp.textContent = `CP ${formatCpTotal(group.bst)}`;

        row.appendChild(icon);
        row.appendChild(name);
        row.appendChild(cp);
        capturedListEl.appendChild(row);
    });
}

// 야생 포켓몬(#monster)을 우측 "상단"으로 옮기되, 내 포켓몬(뒷모습) 쪽과 대칭 구조로 배치함.
// 내 쪽은 [액션박스]-15px-[hp바]-3px-[이름표]-(닿음)-[스프라이트, 위로 자람] 순서라, 야생 쪽은
// 위아래로 뒤집어 [화면 상단]-15px-[이름표]-3px-[hp바]-(닿음)-[스프라이트, 아래로 자람] 순서로
// 둠("이름표는 항상 hp바 위" 규칙을 지키려면 화면 상단에 가까운 쪽이 이름표여야 하기 때문).
// hp바+이름표는 dexBattleDecideBtn 클릭 핸들러에서 이 상수들로 인라인 배치하고, #monster의
// top은 그림 실제 위쪽 끝(SPRITE_OFFSETS 실측)이 hp바 바로 아래에 닿도록 역산함 — #shiny-effect는
// 매번 #monster의 렌더링 위치를 다시 읽으므로(playShinyEffect() 참고) 자동으로 따라옴.
startBtn.addEventListener('click', startGame);
retryBtn.addEventListener('click', startGame);
resultHomeBtn.addEventListener('click', () => {
    // showResultScreen()에서 이미 몬스터/포켓볼/컨트롤패널 등 게임 진행 요소는 다 hidden 처리돼
    // 있고 타이머도 멈춰있는 상태라, 결과창 대신 시작화면만 다시 보여주면 됨
    resultScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
});

// "포켓몬 배틀" 버튼 — 전용 목록 대신 도감(#dex-modal)을 선택 모드로 염. 배틀 결과 화면의
// "다시하기" 버튼과 로직을 공유해, 다시하기는 시작화면으로 안 돌아가고 곧바로 파티 선택부터
// 다시 시작함(openBattlePartyPicker 본체는 pokemon_battle.js에 있고 battleBtn도 거기서 연결됨).

capturedListBtn.addEventListener('click', () => {
    renderCapturedList();
    capturedModal.classList.remove('hidden');
});

// 게임 중 점수(#cp-total)를 눌러 포획한 포켓몬 창을 열었을 때만 true.
// 결과 화면의 "포획한 포켓몬" 버튼으로 열었을 땐 타이머가 이미 멈춰있으므로 관여하지 않음.
let capturedModalOpenedDuringGame = false;

capturedCloseBtn.addEventListener('click', () => {
    capturedModal.classList.add('hidden');
    if (capturedModalOpenedDuringGame) {
        capturedModalOpenedDuringGame = false;
        resumeGameTimer();
    }
});

// ===================== 게임 중 타이머 클릭 → 일시정지 화면 =====================
// 대기 화면(시작/결과 화면)과 같은 스타일의 오버레이를 띄우고, 그동안 타이머를 멈춤
gameTimerEl.addEventListener('click', () => {
    // 일시정지 버그 패치: 몬스터볼/도망치다 애니메이션 도중엔 무시(악용 방지, 퀴즈 모달과 동일한 방식)
    if (!quizModal.classList.contains('hidden') || !capturedModal.classList.contains('hidden') || isAnimating) return;
    pauseGameTimer();
    pauseModal.classList.remove('hidden');
});

function resumeFromPause() {
    pauseModal.classList.add('hidden');
    resumeGameTimer();
}

function quitFromPause() {
    pauseModal.classList.add('hidden');
    onTimeUp(); // 제한시간이 끝났을 때와 동일한 방식으로 결과 화면으로 전환
}

// ===================== 게임 중 점수 클릭 → 포획한 포켓몬 화면 =====================
cpTotalEl.addEventListener('click', () => {
    // 일시정지 버그 패치: 몬스터볼/도망치다 애니메이션 도중엔 무시(악용 방지, 퀴즈 모달과 동일한 방식)
    if (!quizModal.classList.contains('hidden') || !pauseModal.classList.contains('hidden') || isAnimating) return;
    pauseGameTimer();
    capturedModalOpenedDuringGame = true;
    renderCapturedList();
    capturedModal.classList.remove('hidden');
});

throwBtn.addEventListener('click', runThrow);
runawayBtn.addEventListener('click', runRunAway);
