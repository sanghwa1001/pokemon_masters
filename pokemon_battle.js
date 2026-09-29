// ===================== pokemon_battle.js (3v3 대결 — 혼자하기(AI)·함께하기(pvp) 공통 엔진) =====================
// pokemon_pokedex.js(openDexModal/dexPickerMode)와 pokemon_catch.js(initGame)를 그대로
// 가져다 쓰므로 가장 마지막에 로드되어야 함.

const battleBtn   = document.getElementById('battle-btn');
const battlePreviewScreen  = document.getElementById('battle-preview-screen');
const battlePreviewCloseBtn = document.getElementById('battle-preview-close-btn');
// 함께하기 대기(턴 행동 선택/강제 교체/불러오기 신호) 제한시간 타이머 — battle-preview-screen
// 안, 닫기(×) 버튼과 대칭 위치·여백. 파티 선택 대기 전용은 #dex-wait-timer(아래 도감 요소 쪽)
const battleTurnTimerEl = document.getElementById('battle-turn-timer');
const battleBackSpriteBoxEl = document.getElementById('battle-back-sprite-box');
const battleBackSpriteEl   = document.getElementById('battle-back-sprite');
const battleBackShinyEffectEl = document.getElementById('battle-back-shiny-effect');
const battleBackNameEl     = document.getElementById('battle-back-name');
const battleBackTypesEl    = document.getElementById('battle-back-types');
const battleBackInfoTextEl = document.getElementById('battle-back-info-text');
const monsterHpFillEl      = document.getElementById('monster-hp-fill');
const battleAttackBtn      = document.getElementById('battle-attack-btn');
const battleSwitchBtn       = document.getElementById('battle-switch-btn');
const battleMainMenuEl      = document.getElementById('battle-main-menu');
const battleMoveMenuEl      = document.getElementById('battle-move-menu');
const battleMoveListEl      = document.getElementById('battle-move-list');
const battleMoveBackBtn     = document.getElementById('battle-move-back-btn');
// "포켓몬" 버튼을 눌렀을 때 액션박스 안에서 뜨는 교체 이름 버튼 목록
const battleSwitchInlineMenuEl  = document.getElementById('battle-switch-inline-menu');
const battleSwitchInlineListEl  = document.getElementById('battle-switch-inline-list');
const battleSwitchInlineBackBtn = document.getElementById('battle-switch-inline-back-btn');
const battleMessageBoxEl    = document.getElementById('battle-message-box');
const battleBackInfoEl      = document.getElementById('battle-back-info');
const battleBackHpFillEl    = document.getElementById('battle-back-hp-fill');
const battleResultOverlayEl = document.getElementById('battle-result-overlay');
const battleResultHomeBtn   = document.getElementById('battle-result-home-btn');
const battleResultRetryBtn  = document.getElementById('battle-result-retry-btn');

// 포켓몬 도감 모달 요소
const dexBattleSlotRowEl = document.getElementById('dex-battle-slot-row');
const dexBattleActionRowEl = document.getElementById('dex-battle-action-row');
// 함께하기 파티 선택 대기 제한시간 타이머 — dex-box 안, 닫기(×) 버튼과 대칭 위치·여백
const dexWaitTimerEl = document.getElementById('dex-wait-timer');
const dexBattleDecideBtn = document.getElementById('dex-battle-decide-btn');
const dexBattleRandomBtn = document.getElementById('dex-battle-random-btn');

// 도감 설정 화면(⚙ 버튼으로 진입) 요소 — 설정 목록 화면 + 도감 초기화/치트 코드 전용 페이지
// (토글 패널이 아니라 완전히 별도 화면으로 전환됨)
const BACK_FOLDER = {
    normal: { base: 'back',      shiny: 'back_shiny' },
    mega:   { base: 'back_mega', shiny: 'back_mega_shiny' },
    gmax:   { base: 'back_gmax', shiny: 'back_gmax_shiny' },
};

// folder(=BACK_SPRITE_OFFSETS 1단계 키)와 fileId(=2단계 키)를 src와 함께 묶어서 반환 —
// displayBackSprite()가 이 folder/fileId로 BACK_SPRITE_OFFSETS에서 하단 여백(gap)을 바로 조회함
function backSpriteInfo(id, isShiny) {
    const info = POKEMON_DATA[id];
    if (!info) return null;
    const category = info.category;
    const folders = BACK_FOLDER[category] || BACK_FOLDER.normal;
    const folder = isShiny ? folders.shiny : folders.base;
    const fileId = id; // 이제 normal 카테고리도 폼별 전용 뒷모습이 대부분 있어서(back/back_shiny 1462장,
                        // front와 1:1) 폼 id 그대로 시도 — 못 찾으면 displayBackSprite()의 probe.onerror가
                        // baseBackSpriteInfo()(종 단위 폴백)로 자동 대체함
    return { folder, fileId, src: `${SPRITE9_ROOT}/${folder}/${fileId}.png` };
}

function baseBackSpriteInfo(id, isShiny) {
    const info = POKEMON_DATA[id];
    if (!info) return null;
    const folder = isShiny ? BACK_FOLDER.normal.shiny : BACK_FOLDER.normal.base;
    return { folder, fileId: info.species, src: `${SPRITE9_ROOT}/${folder}/${info.species}.png` };
}

// 등장 카테고리(일반 97% / 메가 2.5% / 거다이맥스 0.5%)를 먼저 정하고 그 안에서 고름.
// 일반은 종 먼저 → 폼 순서로 균등 선택해 폼이 많은 종으로 쏠리지 않게 함
let backSpriteAnimTimerId = null;
let currentBackSpriteToken = 0; // 재생 도중 다른 포켓몬으로 바뀌었는지 추적(비동기 로딩 대비)
// 내 포켓몬(뒷모습)의 화면상 그림 높이(px) — 기절 연출이 땅 라인·하강 거리 계산에 씀
let currentBackContentHeight = 0;
// 애니메이션 중 0번 프레임보다 가장 위로 솟는 높이(화면 px, BACK_SPRITE_OFFSETS topSafety × 배율) — 기절 연출이
// 이만큼 더 내려가야 솟는 프레임이 땅 라인 위로 튀어나오지 않음
let currentBackRiseHeight = 0;
// 현재 내 포켓몬(뒷모습)의 이펙트 크기(px) — getEffectSize(off.effectW, off.effectH, 표시 배율), displayBackSprite()가
// 갱신함. 이로치 등장 이펙트와 칼춤/HP회복 이펙트가 같은 값을 씀
let currentBackEffectSize = 0;
// 현재 내 포켓몬(뒷모습)의 키(px) — 모든 프레임 평균 세로(effectH) × 표시 배율. 이펙트 위치(offsetY) 기준
let currentBackEffectBodyHeight = 0;

function stopBackSpriteAnimation() {
    if (backSpriteAnimTimerId !== null) {
        clearInterval(backSpriteAnimTimerId);
        backSpriteAnimTimerId = null;
    }
}

let backShinyAnimTimerId = null;
function stopBackShinyAnimation() {
    if (backShinyAnimTimerId !== null) {
        clearInterval(backShinyAnimTimerId);
        backShinyAnimTimerId = null;
    }
}

// 내 포켓몬(뒷모습)용 이로치 등장 이펙트 — 야생용 playShinyEffect()와 같은 playFrameEffect 사용
function playBackShinyEffect(boxEl, size) {
    stopBackShinyAnimation();
    backShinyAnimTimerId = playFrameEffect(battleBackShinyEffectEl, boxEl, size, currentBackEffectBodyHeight, SHINY_EFFECT, () => {
        backShinyAnimTimerId = null;
    });
}

// 뒷모습도 앞모습(displayMonsterSprite)과 같은 방식으로 재생·크기 계산하고, 그림 하단이
// 이름표에 닿도록 바깥 박스(boxEl) 위치를 역산함. spriteEl은 그림을 그리는 안쪽 레이어.
// _NORMAL/_SHINY 명단: 형제 폼은 애니메이션인데 이 폼만 정지 이미지라 원본 캔버스 크기가 안 맞는
// 종 → 크기 계산에만 형제 폼 높이를 씀(일반/이로치가 따로라 명단도 분리)
const BACK_SPRITE_SIZE_REF_SPECIES_NORMAL = {
    '716': '716-1',           // 제르네아스: 716(정지) vs 716-1(애니메이션, 활동 모드) — 실제 형제가 있음
    '172-1': '172',
    '791-1': '791',
    '792-1': '792',
    '802-1': '802',
    '893-1': '893',
};
const BACK_SPRITE_SIZE_REF_SPECIES_SHINY = {
    '716': '716-1',
    '25-1': '25', '25-2': '25', '25-3': '25', '25-4': '25', '25-5': '25', '25-6': '25',
    '172-1': '172',
    '791-1': '791',
    '792-1': '792',
    '802-1': '802',
    '893-1': '893',
};

const BACK_INFO_GAP = 5; // px — 그림과 정보블록(hp바+이름표) 사이 간격
function displayBackSprite(boxEl, spriteEl, id, isShiny) {
    stopBackSpriteAnimation();
    stopBackShinyAnimation();
    battleBackShinyEffectEl.classList.add('hidden');
    const token = ++currentBackSpriteToken;

    const renderFrom = (info, isFallback) => {
        const probe = new Image();
        probe.onload = () => {
            if (token !== currentBackSpriteToken) return; // 그 사이 다른 포켓몬으로 바뀌었으면 무시

            const naturalW = probe.naturalWidth, naturalH = probe.naturalHeight;
            // w가 h의 정확한 배수일 때만 정사각형 프레임 시트로 나눔, 아니면 전체를 1프레임으로 —
            // build_back_offsets_xywh.py의 frame_w 판정과 같아야 오프셋 실측값과 맞음
            const frameCount = (naturalH > 0 && naturalW % naturalH === 0) ? Math.max(1, naturalW / naturalH) : 1;
            const frameW = frameCount > 1 ? naturalH : naturalW;
            const frameH = naturalH;

            // BACK_SPRITE_OFFSETS의 x/y/w/h는 "원본 프레임 픽셀" 기준 실측값 — displayMonsterSprite()와
            // 동일한 계산에 쓰임(아래 dx/dy/artworkBottomY 참고)
            const off = (typeof BACK_SPRITE_OFFSETS !== 'undefined' &&
                         BACK_SPRITE_OFFSETS[info.folder] &&
                         BACK_SPRITE_OFFSETS[info.folder][info.fileId]) || { x: 0, y: 0, w: frameW, h: frameH };

            // 명단에 있는 종은 크기 계산에만 형제 폼 높이를 씀 — 위치·프레임 자르기는 자기 값
            const refSpeciesId = isShiny ? BACK_SPRITE_SIZE_REF_SPECIES_SHINY[id] : BACK_SPRITE_SIZE_REF_SPECIES_NORMAL[id];
            const refOff = refSpeciesId && BACK_SPRITE_OFFSETS[info.folder] && BACK_SPRITE_OFFSETS[info.folder][refSpeciesId];
            const effectiveFrameH = (refOff && off.h) ? (refOff.h * frameH / off.h) : frameH;

            const boxWidth = boxEl.clientWidth || parseFloat(getComputedStyle(boxEl).width) || 160;
            const scale = boxWidth / SPRITE_REFERENCE_SIZE;
            // 세로 기준 배율로 종족 간 크기감을 맞추고 가로세로 비율은 원본 유지
            const displayH = Math.min(effectiveFrameH * scale, boxWidth);
            const pixelScale = frameH > 0 ? displayH / frameH : 1;
            const displayW = frameW * pixelScale;

            spriteEl.style.backgroundRepeat = 'no-repeat';
            spriteEl.style.backgroundImage = `url("${info.src}")`;
            spriteEl.style.width  = `${displayW}px`;
            spriteEl.style.height = `${displayH}px`;
            spriteEl.style.backgroundSize = `${displayW * frameCount}px ${displayH}px`;

            const dx = off.x * pixelScale;
            const dy = off.y * pixelScale;
            spriteEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

            // 그림 실제 하단(off.h)이 이름표 상단에 닿도록 박스 위치를 역산(alignWildMonsterTopToHpBar의 대칭)
            const boxHeight = boxEl.clientHeight || parseFloat(getComputedStyle(boxEl).height) || 0;
            const artworkBottomY = (boxHeight / 2) + ((off.h || frameH) * pixelScale) / 2;
            // 다른 프레임이 0번보다 아래로 더 내려와도 간격이 BACK_INFO_GAP 이상이 되게 bottomSafety만큼 위로 올림
            const bottomSafety = off.bottomSafety || 0;
            // 이름표 상단이 "그림이 원래 닿는 지점"이지만, BACK_INFO_GAP만큼 위로 더 띄워서
            // 그림과 정보블록 사이 5px 간격을 유지함
            const targetY = battleBackInfoTextEl.offsetTop - BACK_INFO_GAP;
            boxEl.style.top = `${targetY - artworkBottomY - bottomSafety * pixelScale}px`;

            // 기절 연출에서 상대(AI) 쪽과 동일하게 재사용할 수 있도록, 이로치 여부와 상관없이 항상 저장
            currentBackContentHeight = (off.h || frameH) * pixelScale;
            currentBackRiseHeight = (off.topSafety || 0) * pixelScale;
            currentBackEffectSize = getEffectSize(off.effectW || off.w || frameW, off.effectH || off.h || frameH, pixelScale);
            currentBackEffectBodyHeight = (off.effectH || off.h || frameH) * pixelScale;

            if (isShiny) playBackShinyEffect(boxEl, currentBackEffectSize);

            backSpriteAnimTimerId = startFilmstrip(spriteEl, displayW, frameCount);
        };
        probe.onerror = () => {
            if (token !== currentBackSpriteToken) return;
            // 정확한 폼(메가/거다이맥스 등) 뒷모습 파일이 소스에 없는 경우, 기본 폼 뒷모습으로 한 번만 재시도
            if (!isFallback) {
                const fallbackInfo = baseBackSpriteInfo(id, isShiny);
                if (fallbackInfo) renderFrom(fallbackInfo, true);
            }
        };
        probe.src = info.src;
    };

    const info = backSpriteInfo(id, isShiny);
    if (info) renderFrom(info, false);
}

// 상대 쪽 배치는 내 쪽을 위아래로 뒤집은 대칭 — [화면 상단]-15px-[이름표]-3px-[hp바]-[스프라이트, 아래로 자람].
// #monster의 top은 그림 위쪽 끝(SPRITE_OFFSETS 실측)이 hp바 바로 아래에 닿도록 역산함
const WILD_INFO_TOP = 15; // px, #game-container 상단 기준 — 이름표 상단 여백(내 쪽 액션박스-hp바 15px 여백과 대응)
const WILD_INFO_NAME_BLOCK_HEIGHT = 21; // px — 이름표 줄높이(18, CSS --battle-name-line) + hp바와의 여백(3), 이름표 바로 아래에 hp바가 옴
const WILD_INFO_GAP = 5; // px — 정보블록(이름표+hp바)을 스프라이트에서 위로 띄우는 간격
// 이름표 줄 높이가 타입 아이콘 때문에 가정보다 커질 때 hp바 여백을 맞추는 보정값(지금은 0)
const WILD_INFO_TEXT_ROW_CORRECTION = 0;
function alignWildMonsterTopToHpBar(picked) {
    // 이 콜백이 예약된 뒤(이미지 로딩 등으로 지연되는 사이) 배틀 프리뷰가 이미 닫혔으면, 지금은
    // #monster가 실제 포획 게임 용도로 쓰이고 있는 것이므로 절대 위치를 건드리면 안 됨
    if (!battlePreviewActive) return;
    const off = getFrontSpriteMetrics(picked.id, picked.isShiny) || {};
    const contentH = off.h || currentMonsterFrameSize;
    const pixelScale = currentMonsterFrameSize > 0 ? (currentMonsterDisplaySize / currentMonsterFrameSize) : 1;

    const boxHeight = monster.clientHeight || parseFloat(getComputedStyle(monster).height) || 0;
    const artworkTopY = (boxHeight / 2) - (contentH * pixelScale) / 2; // 박스 상단 기준 그림 윗쪽 끝 위치

    // 다른 프레임이 0번보다 위로 더 솟아도 간격이 WILD_INFO_GAP 이상이 되게 topSafety만큼 아래로 내림
    const topSafety = off.topSafety || 0;

    // 정보블록은 이미 WILD_INFO_GAP만큼 올라가 있으므로, 올리기 전 자리 기준으로 계산해야 간격이 생김
    const nominalHpBarBottom = WILD_INFO_TOP + WILD_INFO_NAME_BLOCK_HEIGHT + monsterInfo.offsetHeight;
    monster.style.top = `${nominalHpBarBottom - artworkTopY + topSafety * pixelScale}px`;
    // 가로 위치는 .battle-side-right(CSS, 고정 오프셋)로 처리 — 원본 게임(PLAYER_BASE_X/FOE_BASE_X)과
    // 동일하게 계산 없는 고정값
}

// ===================== 3v3 AI 트레이너 배틀 엔진 =====================
// 데미지 = (기준값 + 종족치 보너스) × 타입 상성 × 랭크업 × 치명타. 선공은 매 턴 50:50.
// 기술은 공격/랭크업/회복 3개로 고정하고, 공격은 자기 타입 중 유리한 쪽 배율을 씀.
// 내 행동 → 상대 행동 → 판정 구조라서 AI는 즉시 응답하고, 함께하기(pvp)는 그 자리만 네트워크로 바꿈
const BATTLE_MON_MAX_HP = 100;
const BATTLE_BASE_DAMAGE = 20; // 상성 배율(0/0.25/0.5/1/2/4)과 랭크업 배율, 치명타 배율을 곱하는 기준값
const BATTLE_ACCURACY = 0.95;    // 공격 명중률(95%) — 랭크업/회복은 자기 자신 대상이라 빗나가지 않음
const BATTLE_CRIT_CHANCE = 0.05; // 치명타 확률(5%)
const BATTLE_CRIT_MULT = 2;      // 치명타 데미지 배율(2배)
// 종족치(bst) 보너스 — 175→+1, 500→+5, 770→+10을 지나는 지수함수(포획 확률 공식과 같은 구조, K만 음수)
const BATTLE_DMG_BONUS_A = 5.539371444888705;
const BATTLE_DMG_BONUS_K = -0.001381995458994817;
const BATTLE_DMG_BONUS_C = -6.054955248445392;
const BATTLE_DMG_BONUS_MIN = 1;    // bst 최저(175)일 때 보너스
const BATTLE_DMG_BONUS_MAX = 10;   // bst 최고(770)일 때 보너스
// 메가/거다이맥스는 공식 대신 고정 보너스 — 공식이 일반 bst 범위용이라서
const BATTLE_DMG_BONUS_MEGA_GMAX = 15;
const BATTLE_HP_BAR_CHANGE_TIME = 1000 / 2; // ms
const BATTLE_MESSAGE_CHAR_DELAY = CAPTURE_CHAR_DELAY; // ms/글자 — 포획 메시지와 동일한 속도로 통일
const BATTLE_MESSAGE_HOLD = 650; // 메시지 다 타이핑된 뒤 다음 메시지로 넘어가기 전 대기시간(ms)
// 승패·끊김 멘트처럼 다 보인 뒤 결과 화면/시작 화면으로 넘어가는 멘트만 쓰는 대기시간(ms) — 화면이
// 바뀌기 전에 한 박자 더 머물게 함(함께하기 선택창 끊김 안내는 별도 값 MP_PICKER_DISCONNECT_HOLD_MS)
const BATTLE_SCREEN_TRANSITION_HOLD = 1000;

// 랭크업: 최대 6단계, n단째 배율 = 1 + 0.5n (1단=1.5배 ~ 6단=4배). 기절/교체되면 초기화됨
const BATTLE_RANK_MAX = 6;
const BATTLE_RANK_MULT_PER_STAGE = 0.5;
// 회복: 최대 hp의 50%만큼 회복(최대치 초과 불가)
const BATTLE_HEAL_FRACTION = 0.5;
// AI 포켓몬 1마리당 최대 회복 횟수 — 회복만 반복해 배틀이 끝나지 않는 것을 막음(플레이어는 제한 없음)
const AI_HEAL_MAX_USES = 2;
// 1타입 포켓몬 공격 보정 — 2타입은 유리한 쪽을 골라 쓰니 1타입이 구조적으로 불리해서 상쇄함.
// 값은 배틀 시뮬레이션에서 1타입/2타입 비율에 상관없이 승률이 50:50에 가장 가까운 지점
const SINGLE_TYPE_BONUS_MULT = 1.35;

// ===================== AI 행동 스코어링 상수 =====================
// AI는 공격/랭크업/회복/교체에 점수를 매겨 점수 비례 가중 랜덤으로 고름
const AI_SCORE_BASE = 100; // 공격/회복 점수의 기준 스케일

const AI_ATTACK_RANK_BONUS = 0.15;  // 랭크 1당 공격 점수 +15% — 쌓은 랭크를 써먹게 유도
const AI_ATTACK_SCORE_FLOOR = 5;    // 상성 0배(면역)여도 공격이 완전히 배제되진 않도록 하는 최소 점수
const AI_ATTACK_KO_BONUS_MULT = 3;  // 이번 공격으로 상대를 쓰러뜨릴 수 있다고 예측되면 곱해지는 배율

// 랭크업 점수: 이미 쌓인 랭크가 높을수록, 상성이 이미 좋을수록, 위협받는 정도가 클수록, hp가
// 위험할수록 매력이 떨어짐(맞다 죽으면 손해)
const AI_RANKUP_BASE_SCORE = 60;
const AI_RANKUP_GOOD_MATCHUP_DAMP = 0.3;  // 상성이 이미 2배 이상이면 곱해지는 감쇠(그냥 때리는 게 나음)
const AI_RANKUP_THREAT_DAMP_RANGE = 3;    // 위협배율(-1)이 이만큼 오를 때 threatDamp가 최소치까지 선형 감소
const AI_RANKUP_THREAT_DAMP_MIN = 0.15;
const AI_RANKUP_HP_SAFETY_FLOOR = 0.4;    // 이 hp비율 밑으로는 랭크업 점수가 선형으로 0까지 깎임

// 회복 점수: hp가 SOFT_CEILING 아래부터 생기고 낮을수록 빠르게 커짐.
// 회복해도 다음 공격에 죽거나(FUTILE) 이번 턴에 상대를 끝낼 수 있으면(KO_OPPORTUNITY) 크게 깎임
const AI_HEAL_SOFT_CEILING = 0.7;
const AI_HEAL_SCORE_EXP = 1.5;
const AI_HEAL_FUTILE_DAMP = 0.25;
const AI_HEAL_KO_OPPORTUNITY_DAMP = 0.2;

// 교체 후보 점수 가중치 — 공격, 방어(감점), hp. SCALE은 다른 행동과 같은 점수 스케일로 맞추는 배율
const AI_SWITCH_OFFENSE_WEIGHT = 1.0;
const AI_SWITCH_DEFENSE_WEIGHT = 0.8;
const AI_SWITCH_HP_WEIGHT = 0.3;
const AI_SWITCH_SCORE_SCALE = 150;

// 지금 나가있는 포켓몬의 랭크업 단계(0~BATTLE_RANK_MAX) — 교체/기절 시 0으로 초기화됨
let playerRank = 0;
let aiRank = 0;
// 지금 나가있는 AI 포켓몬이 이번에 나가있는 동안 회복을 쓴 횟수 — 다음 포켓몬으로 바뀌면 0으로 리셋
let aiHealUses = 0;

// 랭크업 단계 → 데미지 배율
function rankMultiplier(rank) {
    return 1 + BATTLE_RANK_MULT_PER_STAGE * (rank || 0);
}

// 종족치(bst, 원본) → 데미지 보너스(정수, BATTLE_BASE_DAMAGE에 더해짐). pokemon_catch.js의
// getCatchProbability()와 같은 구조 — 메가/거다이맥스는 공식 대신 고정값을 씀
function getDamageBonus(bst, category) {
    if (category === 'mega' || category === 'gmax') return BATTLE_DMG_BONUS_MEGA_GMAX;
    const raw = BATTLE_DMG_BONUS_C + BATTLE_DMG_BONUS_A * Math.exp(-BATTLE_DMG_BONUS_K * bst);
    return Math.round(Math.min(BATTLE_DMG_BONUS_MAX, Math.max(BATTLE_DMG_BONUS_MIN, raw)));
}

// 상대(AI 트레이너)의 파티 — [{id, isShiny, hp, fainted}]. 야생 등장 로직으로 3마리를 뽑음(pickAiTeam)
let aiParty = [];
let activeAiIndex = 0;

// 상대/내 hp바 — 같은 공통 로직(createHpBarController)을 채움 요소만 다르게 해서 씀
const aiHpBar = createHpBarController(monsterHpFillEl);
const playerHpBar = createHpBarController(battleBackHpFillEl);

let battleTurnBusy = false;     // 공격 상호작용 연출 진행 중 — 다른 입력을 막음
let battleEnded = false;        // 승패가 결정된 뒤(결과 오버레이가 떠 있는 동안) 남은 처리를 막음
let battleSwitchForced = false; // 내 포켓몬이 기절해서 강제로 교체해야 하는 상태(취소 불가)
let pendingForcedSwitchCallback = null; // 강제 교체가 끝나면 이어서 실행할 턴 진행 콜백
// 'ai' = 혼자하기(AI 트레이너), 'pvp' = 함께하기(상대가 사람, pokemon_multiplayer.js) — beginBattle()이 정함.
// pvp에서도 상대 쪽 상태는 AI와 같은 변수(aiParty/activeAiIndex/aiRank, side 'ai')를 그대로 씀
let battleMode = 'ai';
const isPvpBattle = () => battleMode === 'pvp'; // 함께하기 여부 — 모드 분기는 이 함수로만 확인
let mpTurn = 0;              // 함께하기 턴 번호 — 양쪽이 같은 턴의 행동끼리 짝지어졌는지 확인용
let mpMissStreak = 0;        // 상대가 연속으로 제한시간을 넘겨 패스된 횟수 — 2번이면 상대 기권으로 처리(안전장치)
let selfPassStreak = 0;    // 내가 연속으로 자동 패스한 횟수 — 2번째면 턴을 시작하지 않고 바로 기권
                              // (상대 감지를 기다리면 그 사이 상대 화면에 턴이 진행되는 것처럼 보임)
let mpAwaitingOpponentAction = false; // 내 행동을 보내고 상대 메시지를 기다리는 중인지 — 이 상태로
                                       // 제한시간이 다 되면 여유를 더 준 뒤 끊김 여부를 판정
// 대기 제한시간(ms, 혼자하기·함께하기 공통) — 모두 "할 일이 생긴 쪽의 개인 시간"이라 그쪽이 스스로 처리함.
// 액션: 놓치면 패스, 연속 2번째면 기권. 강제 교체: 놓치면 기권. 파티 선택: 선택 완료해도 리셋 안 됨.
// 불러오기: 시간 초과는 누구 탓도 아니라 승패 없는 종료(끊김 멘트).
// 함께하기에서 기다리는 쪽은 같은 시간 + 여유(MP_PEER_SLACK_MS)가 지나도 응답이 없을 때만 끊김으로 판정
const BATTLE_ACTION_TIMEOUT_MS = 60000;
const BATTLE_FORCED_SWITCH_TIMEOUT_MS = 60000;
const BATTLE_PARTY_TIMEOUT_MS = 100000;
const BATTLE_LOADED_TIMEOUT_MS = 100000;
const MP_REMATCH_TIMEOUT_MS = 60000; // 다시하기를 누르고 상대를 기다리는 최대 시간
let mpPartyLocked = false;   // 함께하기 선택창에서 "선택 완료"를 누르고 상대를 기다리는 중(파티 수정 불가)
let mpMyLoadSent = false;    // 내 배틀 에셋 로딩을 끝내고 'loaded' 신호를 이미 보냈는지(상대
                              // 신호를 기다리는 중인지) — 켜져 있으면 여유를 더 준 뒤 판정
let mpRematchWaiting = false; // 함께하기 결과 화면에서 "다시하기"를 누르고 상대를 기다리는 중
let mpPickerEndText = null;  // 함께하기 선택창에서 대전이 끝나(항복/끊김) 안내를 보여주는 중이면 그 문구(잠시 뒤 시작화면으로)
// 함께하기 종료(항복/끊김) 멘트는 안전 지점에서만 — 진행 중인 턴 연출은 끝까지 재생한 뒤 띄움
let battleAnimating = false; // 지금 턴/등장 연출이 재생 중인지(= 안전 지점이 아님)
let mpPendingTerminal = null;  // 연출 중에 도착해 안전 지점까지 미뤄 둔 종료 정보
// ---- 재접속(새로고침 후 복귀) 관련 — pokemon_multiplayer.js의 mpTryRejoin/mpPerformResync와 짝 ----
let mpLoadingPhase = false;         // 배틀 화면은 열렸지만 아직 첫 등장 연출 전(스프라이트 불러오는 중)
let mpAwaitingForcedSwitch = false; // 상대 포켓몬이 기절해 상대의 교체 선택을 기다리는 중
let mpPendingSubmission = null;     // 이번 턴에 이미 낸 내 행동 { turn, action, nonce } — 한 번 낸 행동은
                                     // 확정이므로, 재동기화 때 같은 값으로 교환을 다시 함
let mpPeerCommitTurn = -1;          // 상대의 commit을 받은 턴 번호(상대가 이미 행동을 확정했는지)
let mpPendingResync = false;        // 상대가 돌아와 재동기화를 요청했는데 아직 안전 지점이 아님
let battleLastDidWin = null;        // 마지막 대전 승패(결과 화면 복원용)
const MP_RESUME_MIN_MS = 10000;     // 재접속 후 이어서 주는 제한시간의 최소값(화면을 다시 볼 시간)
const MP_PENDING_SUBMISSION_KEY = 'mpPendingSubmission'; // 새로고침해도 이미 낸 행동을 복구하려고 탭 저장소에 둠
// 선택창 끊김 안내(버튼 글자라 즉시 다 보임)를 보여준 뒤 시작화면으로 넘어가기까지의 시간(ms) — 사용자 지정으로
// 승패·배틀 중 끊김 멘트의 머무는 시간(BATTLE_SCREEN_TRANSITION_HOLD, 1초)과 별개로 1.5초
const MP_PICKER_DISCONNECT_HOLD_MS = 1500;

// ---------------- 대결 제한시간 타이머(UI 포함, 혼자하기·함께하기 공통) ----------------
// 액션/강제 교체/파티 선택/불러오기/다시하기 대기가 이 타이머 하나를 씀(겹칠 일이 없음).
// 내 결정 대기는 정확히 durationMs에 처리하고, 상대 메시지 대기는 mpPeerSlackThenJudge로 여유를 더 줌
let battleTimerTimeout = null;
let battleTimerInterval = null;
let battleTimerEl = null;
let battleTimerGen = 0; // 타이머를 새로 걸거나 지울 때마다 증가 — 보류된 판정이 아직 유효한지 확인용
let battleTimerEndAt = 0; // 지금 걸려 있는 타이머의 만료 시각 — 재접속 때 남은 시간을 이어서 주려고 기록

function formatBattleCountdown(ms) {
    return formatMMSS(Math.max(0, Math.ceil(ms / 1000)));
}

function clearBattleTimer() {
    battleTimerGen++;
    battleTimerEndAt = 0;
    if (battleTimerTimeout) { clearTimeout(battleTimerTimeout); battleTimerTimeout = null; }
    if (battleTimerInterval) { clearInterval(battleTimerInterval); battleTimerInterval = null; }
    if (battleTimerEl) { battleTimerEl.classList.add('hidden'); battleTimerEl = null; }
}

// el 안에 남은 시간을 표시하며 durationMs 안에 clearBattleTimer()가 불리지 않으면
// onTimeout()을 실행함(el이 없으면 표시 없이 타이머만 동작)
function startBattleTimer(el, durationMs, onTimeout) {
    clearBattleTimer();
    battleTimerEl = el || null;
    const endAt = Date.now() + durationMs;
    battleTimerEndAt = endAt;
    if (battleTimerEl) {
        battleTimerEl.textContent = formatBattleCountdown(durationMs);
        battleTimerEl.classList.remove('hidden');
        battleTimerInterval = setInterval(() => {
            if (battleTimerEl) battleTimerEl.textContent = formatBattleCountdown(endAt - Date.now());
        }, 1000);
    }
    battleTimerTimeout = setTimeout(() => {
        battleTimerTimeout = null;
        clearBattleTimer();
        onTimeout();
    }, durationMs);
}

// 지금 걸려 있는 타이머의 남은 시간(ms) — 걸려 있지 않으면 null
function battleTimerRemaining() {
    return battleTimerEndAt ? Math.max(0, battleTimerEndAt - Date.now()) : null;
}

// AI 팀 구성 — 야생 등장 확률(pickRandomMonster)을 그대로 재사용
function pickAiTeam() {
    const team = [];
    for (let i = 0; i < 3; i++) {
        const m = pickRandomMonster();
        // known: 전장에 한 번이라도 나와서 플레이어에게 공개됐는지(상태 확인 창에서 안 나온 상대는 물음표로 가림)
        team.push({ id: m.id, isShiny: m.isShiny, hp: BATTLE_MON_MAX_HP, fainted: false, known: false });
    }
    return team;
}

// battleParty/aiParty의 {id, isShiny} 엔트리를 pickRandomMonster()와 같은 모양의 "표시용 몬스터
// 객체"로 바꿔줌 — initGame()/displayMonsterSprite() 등 기존 함수가 그 모양을 그대로 기대하기 때문
function partyEntryToMonsterObj(entry) {
    const info = POKEMON_DATA[entry.id] || { name: '???', bst: 0, category: 'normal' };
    const category = info.category || 'normal';
    const effectiveBst = info.bst * getCpMultiplier(category, entry.isShiny); // pokemon_catch.js 공용 함수
    return {
        id: entry.id, category,
        src: frontSpriteSrc(entry.id, entry.isShiny),
        isShiny: entry.isShiny, name: info.name, bst: info.bst, effectiveBst
    };
}

// 공격 타입 하나 vs 방어 측 타입(1~2개)의 상성 배율(0/0.25/0.5/1/2/4) — TYPE_CHART는 방어 타입
// 기준으로 "이 타입이 weak/resist/immune인 공격 타입 목록"을 담고 있음(pokemon_battle_data.js)
function getTypeEffectiveness(moveType, defenderTypes) {
    let mult = 1;
    (defenderTypes || []).forEach(dt => {
        const chart = TYPE_CHART[dt];
        if (!chart) return;
        if (chart.immune.includes(moveType)) mult *= 0;
        else if (chart.weak.includes(moveType)) mult *= 2;
        else if (chart.resist.includes(moveType)) mult *= 0.5;
    });
    return mult;
}

// 순수 상성 배율(보정 전) — 데미지 멘트 판정은 이 값만 봄
function getBaseTypeMultiplier(attackerTypes, defenderTypes) {
    const types = attackerTypes || [];
    if (types.length === 0) return 1;
    return Math.max(...types.map(t => getTypeEffectiveness(t, defenderTypes)));
}

// 데미지 계산용 배율 — 순수 상성에 1타입 보정(SINGLE_TYPE_BONUS_MULT)까지 곱함(멘트 판정엔 안 씀)
function getAttackEffectiveness(attackerTypes, defenderTypes) {
    const base = getBaseTypeMultiplier(attackerTypes, defenderTypes);
    return (attackerTypes || []).length === 1 ? base * SINGLE_TYPE_BONUS_MULT : base;
}

// 위협도 = "상대가 나를 때리면 얼마나 아픈가" — getAttackEffectiveness를 인자만 뒤집어 재사용.
// 단일 타입 보정도 상대 쪽에 그대로 적용됨(공격/피격 양방향에 대칭적으로 적용).
function getThreatMultiplier(myTypes, foeTypes) {
    return getAttackEffectiveness(foeTypes, myTypes);
}

// 공격자 정보+랭크+방어측 타입 → 예상 데미지(정수). 실제 데미지 공식(resolveSingleAction)과
// 동일한 공식이되 치명타는 굴리지 않음(AI 예측 전용, 실제 판정과는 무관한 별도 함수)
function estimateDamage(attackerInfo, attackerRank, defenderTypes) {
    const mult = getAttackEffectiveness(attackerInfo.types || [], defenderTypes);
    const bonus = getDamageBonus(attackerInfo.bst, attackerInfo.category);
    return Math.round((BATTLE_BASE_DAMAGE + bonus) * mult * rankMultiplier(attackerRank));
}

// 교체 후보(또는 지금 나가있는 개체)의 이 상대 기준 종합 점수 — 공격·방어·hp.
// 교체해 들어오면 랭크가 0이라, 랭크를 쌓은 개체는 자연히 안 바뀌는 쪽으로 기움
function scoreBenchCandidate(candidateInfo, candidateRank, candidateHpRatio, foeInfo, foeRank) {
    const offense = estimateDamage(candidateInfo, candidateRank, foeInfo.types || []) / BATTLE_MON_MAX_HP;
    const defense = estimateDamage(foeInfo, foeRank, candidateInfo.types || []) / BATTLE_MON_MAX_HP;
    return AI_SWITCH_OFFENSE_WEIGHT * offense - AI_SWITCH_DEFENSE_WEIGHT * defense + AI_SWITCH_HP_WEIGHT * candidateHpRatio;
}

// scores: { key: score(0 이상), ... } → 점수 비례 가중 랜덤으로 key 하나 반환. 전부 0이면
// 최고점(동률 시 먼저 나온 키)을 그대로 반환 — 항상 뭔가는 선택되어야 함.
function weightedPick(scores) {
    const entries = Object.entries(scores).filter(([, v]) => v > 0);
    if (entries.length === 0) return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    const total = entries.reduce((sum, [, v]) => sum + v, 0);
    let r = Math.random() * total;
    for (const [key, v] of entries) { r -= v; if (r <= 0) return key; }
    return entries[entries.length - 1][0];
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// AI 행동 네 가지에 각각 점수를 매김(Pokemon Essentials AI의 가중 랜덤 구조를 단순화).
// defenderId/defenderHp: 상대(플레이어) 활성 개체 — KO 예측과 위협도 계산용
function computeAiActionScores(aiEntry, defenderId, defenderHp) {
    const myInfo = POKEMON_DATA[aiEntry.id] || {};
    const foeInfo = POKEMON_DATA[defenderId] || {};
    const myHpRatio = aiEntry.hp / BATTLE_MON_MAX_HP;

    const outgoingMult = getAttackEffectiveness(myInfo.types || [], foeInfo.types || []);
    const incomingMult = getThreatMultiplier(myInfo.types || [], foeInfo.types || []);
    const myDamage = estimateDamage(myInfo, aiRank, foeInfo.types || []);
    const incomingDamage = estimateDamage(foeInfo, playerRank, myInfo.types || []);
    const canKoNow = myDamage >= defenderHp;

    // --- 공격 ---
    let attackScore = Math.max(AI_ATTACK_SCORE_FLOOR, AI_SCORE_BASE * outgoingMult) * (1 + AI_ATTACK_RANK_BONUS * aiRank);
    if (canKoNow) attackScore *= AI_ATTACK_KO_BONUS_MULT;

    // --- 랭크업 --- (위협이 클수록, hp가 위험할수록, 이미 상성이 좋을수록 매력이 떨어짐)
    let rankupScore = 0;
    if (aiRank < BATTLE_RANK_MAX) {
        const matchupDamp = outgoingMult >= 2 ? AI_RANKUP_GOOD_MATCHUP_DAMP : 1;
        const threatDamp = clamp(1 - (incomingMult - 1) / AI_RANKUP_THREAT_DAMP_RANGE, AI_RANKUP_THREAT_DAMP_MIN, 1);
        const hpSafety = clamp(myHpRatio / AI_RANKUP_HP_SAFETY_FLOOR, 0, 1);
        rankupScore = AI_RANKUP_BASE_SCORE * (1 - aiRank / BATTLE_RANK_MAX) * matchupDamp * threatDamp * hpSafety;
    }

    // --- 회복 --- (hp가 낮을수록 매력적, 단 회복해도 다음 한 방에 죽으면 무의미해서 감쇠)
    let healScore = 0;
    if (aiEntry.hp < BATTLE_MON_MAX_HP && aiHealUses < AI_HEAL_MAX_USES) {
        const deficit = clamp((AI_HEAL_SOFT_CEILING - myHpRatio) / AI_HEAL_SOFT_CEILING, 0, 1);
        healScore = AI_SCORE_BASE * Math.pow(deficit, AI_HEAL_SCORE_EXP);
        const healedHp = Math.min(BATTLE_MON_MAX_HP, aiEntry.hp + Math.round(BATTLE_MON_MAX_HP * BATTLE_HEAL_FRACTION));
        if (incomingDamage >= healedHp) healScore *= AI_HEAL_FUTILE_DAMP; // 회복해도 한 방에 죽음 → 헛수고
        if (canKoNow) healScore *= AI_HEAL_KO_OPPORTUNITY_DAMP;          // 내가 끝낼 수 있으면 회복보다 공격
    }

    // --- 교체 --- (지금 자리 유지 점수 vs 벤치 최고 점수의 "차이"를 그대로 액션 점수로 씀)
    const currentScore = scoreBenchCandidate(myInfo, aiRank, myHpRatio, foeInfo, playerRank);
    let switchIdx = -1, bestScore = currentScore;
    aiParty.forEach((p, idx) => {
        if (idx === activeAiIndex || p.fainted) return;
        const pInfo = POKEMON_DATA[p.id] || {};
        const score = scoreBenchCandidate(pInfo, 0, p.hp / BATTLE_MON_MAX_HP, foeInfo, playerRank); // 교체 시 랭크는 0
        if (score > bestScore) { bestScore = score; switchIdx = idx; }
    });
    const switchScore = switchIdx === -1 ? 0 : Math.max(0, bestScore - currentScore) * AI_SWITCH_SCORE_SCALE;

    return { attack: attackScore, rankup: rankupScore, heal: healScore, switchIdx, switchScore };
}

// AI가 이번 턴 낼 행동을 고름 — computeAiActionScores로 매긴 4가지 점수 중 가중 랜덤으로 하나를
// 선택. 반환값은 문자열('attack'/'rankup'/'heal') 또는 교체 시 { switch: 대상 인덱스 }.
function pickAiTurnAction(aiEntry, defenderId, defenderHp) {
    const s = computeAiActionScores(aiEntry, defenderId, defenderHp);
    const choice = weightedPick({ attack: s.attack, rankup: s.rankup, heal: s.heal, switch: s.switchScore });
    return choice === 'switch' ? { switch: s.switchIdx } : choice;
}

// ===================== hp바 표시/애니메이션 (상대 · 나 공통) =====================
// 색 기준(50%/25%)과 선형 애니메이션은 Pokemon Essentials의 hp바와 같음

// hp바 하나 — animate(from, to, onDone), reset(hp), cancel()
function createHpBarController(fillEl) {
    let displayedHp = BATTLE_MON_MAX_HP;
    let animId = null;

    function render() {
        const frac = Math.max(0, Math.min(1, displayedHp / BATTLE_MON_MAX_HP));
        fillEl.style.width = `${(96 / 138) * frac * 100}%`;
        let bandY = '0%';
        if (frac <= 0.25) bandY = '100%';
        else if (frac <= 0.5) bandY = '50%';
        fillEl.style.backgroundPosition = `0% ${bandY}`;
    }

    function cancel() {
        if (animId !== null) { cancelAnimationFrame(animId); animId = null; }
    }

    function animate(fromVal, toVal, onDone) {
        cancel();
        if (fromVal === toVal) {
            displayedHp = toVal;
            render();
            if (onDone) onDone();
            return;
        }
        const startTime = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - startTime) / BATTLE_HP_BAR_CHANGE_TIME);
            displayedHp = fromVal + (toVal - fromVal) * t;
            render();
            if (t < 1) {
                animId = requestAnimationFrame(step);
            } else {
                animId = null;
                if (onDone) onDone();
            }
        };
        animId = requestAnimationFrame(step);
    }

    function reset(hp) {
        cancel();
        displayedHp = hp;
        render();
    }

    return { animate, reset, cancel };
}

// ===================== 기절 연출 =====================

const WILD_FAINT_SPEED = 0.5;          // px/ms — 일정한 하강 속도
const WILD_FAINT_CLEAR_BUFFER = 24;    // px — 머리끝까지 땅 밑으로 확실히 잠기도록 더 이동시키는 여유값
const WILD_FAINT_MIN_DURATION = 300;   // ms
const WILD_FAINT_MAX_DURATION = 900;   // ms

// 기절 연출 공통 — 그림 최하단에 clip-path로 땅 라인을 고정하고 안쪽 그림만 아래로 미끄러뜨림.
// riseOnScreen: 애니메이션 중 가장 위로 솟는 높이 — 솟는 프레임도 땅 라인 위로 안 튀어나오게 더 내림
function playFaintSink(boxEl, spriteEl, contentHeightOnScreen, riseOnScreen, stopAnim, onComplete) {
    const boxHeight = boxEl.clientHeight || parseFloat(getComputedStyle(boxEl).height) || 0;
    const artworkBottomY = (boxHeight / 2) + (contentHeightOnScreen / 2);
    const groundClipInset = Math.max(0, boxHeight - artworkBottomY);

    const travelDistance = contentHeightOnScreen + (riseOnScreen || 0) + WILD_FAINT_CLEAR_BUFFER;
    const duration = Math.min(WILD_FAINT_MAX_DURATION,
        Math.max(WILD_FAINT_MIN_DURATION, travelDistance / WILD_FAINT_SPEED));

    boxEl.style.clipPath = `inset(0 0 ${groundClipInset}px 0)`;

    const restoreTransform = spriteEl.style.transform || '';
    spriteEl.style.transition = `transform ${duration}ms ease-in`;
    void spriteEl.offsetHeight;
    spriteEl.style.transform = `${restoreTransform} translateY(${travelDistance}px)`;

    setTimeout(battleCallback(() => {
        stopAnim();
        onComplete();
    }), duration);
}

// 상대(AI) 포켓몬 기절 연출 — #monster 기준, 그림 높이는 SPRITE_OFFSETS 실측값(0번 프레임) × 표시 배율
function playAiFaintAnimation(onComplete) {
    stopShinyAnimation();
    shinyEffect.classList.add('hidden');

    const off = getFrontSpriteMetrics(currentMonsterId, currentIsShiny) || {};
    const contentH = off.h || currentMonsterFrameSize;
    const pixelScale = currentMonsterFrameSize > 0 ? (currentMonsterDisplaySize / currentMonsterFrameSize) : 1;
    playFaintSink(monster, monster.querySelector('#monster-sprite'), contentH * pixelScale,
        (off.topSafety || 0) * pixelScale, stopSpriteAnimation, onComplete);
}

// 내 포켓몬(뒷모습) 기절 연출 — 그림 높이는 displayBackSprite()가 저장해 둔 currentBackContentHeight
// (BACK_SPRITE_OFFSETS 실측값 × 표시 배율). 상대 쪽과 같은 공통 로직(playFaintSink)을 씀
function playPlayerFaintAnimation(onComplete) {
    stopBackShinyAnimation();
    battleBackShinyEffectEl.classList.add('hidden');
    playFaintSink(battleBackSpriteBoxEl, battleBackSpriteEl, currentBackContentHeight || 0,
        currentBackRiseHeight || 0, stopBackSpriteAnimation, onComplete);
}

// ===================== 공격 연출 =====================

const ATTACK_LUNGE_DISTANCE = 28;   // px — 공격자가 상대 쪽으로 튀어나가는 거리
const ATTACK_LUNGE_OUT_MS = 65;     // ms — 상대 쪽으로 튀어나가는 시간
const ATTACK_LUNGE_BACK_MS = 115;   // ms — 제자리로 돌아오는 시간
const ATTACK_HIT_BLINK_COUNT = 4;   // 피격 시 깜빡이는 횟수(실제 게임의 피격 점멸)
const ATTACK_HIT_BLINK_DURATION = 320; // ms — 점멸 전체 길이

// 진행 중인 공격 연출 — 배틀을 도중에 닫으면 cancel()해서 뒤이은 콜백(데미지/멘트)이 안 돌게 함
let runningAttackAnims = [];

// 박스 위치가 transform으로 잡혀 있어서 개별 속성 translate를 애니메이션함(끝나면 흔적 없음)
function playBattleAnim(el, keyframes, duration, onDone) {
    const anim = el.animate(keyframes, { duration, easing: 'linear' });
    runningAttackAnims.push(anim);
    anim.onfinish = () => {
        runningAttackAnims = runningAttackAnims.filter(a => a !== anim);
        onDone();
    };
}

function cancelAttackAnimations() {
    runningAttackAnims.forEach(a => a.cancel());
    runningAttackAnims = [];
    stopBattleEffect();
}

function battleSpriteBoxOf(side) {
    return side === 'player' ? battleBackSpriteBoxEl : monster;
}

// 공격자가 상대 쪽(내 포켓몬은 위, 상대는 아래)으로 빠르게 튀어나갔다가 천천히 돌아옴
function playAttackLunge(attackerSide, onDone) {
    const dy = attackerSide === 'player' ? -ATTACK_LUNGE_DISTANCE : ATTACK_LUNGE_DISTANCE;
    const total = ATTACK_LUNGE_OUT_MS + ATTACK_LUNGE_BACK_MS;
    playBattleAnim(battleSpriteBoxOf(attackerSide), [
        { translate: '0 0', easing: 'ease-out' },
        { translate: `0 ${dy}px`, offset: ATTACK_LUNGE_OUT_MS / total, easing: 'ease-in-out' },
        { translate: '0 0' },
    ], total, onDone);
}

// 피격 점멸 — 원래 게임처럼 보였다 안 보였다를 딱딱 끊어서 반복(중간 투명도 없음)
function playHitBlink(defenderSide, onDone) {
    const frames = [];
    for (let i = 0; i < ATTACK_HIT_BLINK_COUNT; i++) {
        frames.push({ opacity: 0, easing: 'steps(1, end)' }, { opacity: 1, easing: 'steps(1, end)' });
    }
    frames.push({ opacity: 1 });
    playBattleAnim(battleSpriteBoxOf(defenderSide), frames, ATTACK_HIT_BLINK_DURATION, onDone);
}

// ===================== 랭크업/회복 이펙트 =====================

// 칼춤/HP회복 이펙트 필름스트립 — 이로치 이펙트와 같은 규칙으로 잘라 같은 로직으로 크기·위치를 계산
const BATTLE_EFFECTS = {
    // 원작 칼춤은 칼들이 머리 근처에 모임 — 원작에서 칼들의 최대 범위 중심(포켓몬 중심보다 61px 위)이 기준 포켓몬
    // (키 128)의 머리 끝(64px 위)과 거의 같은 높이라서, 칼 무리 중심을 포켓몬 머리 끝(키의 절반 위)에 맞춤
    SWORDS_DANCE: { src: 'images/pokemon/battle/swords_dance.png', frameCount: 21, offsetY: -0.5 },
    RECOVER:      { src: 'images/pokemon/battle/recover.png',      frameCount: 9 },
};

// 첫 재생 때 그림이 늦게 떠서 깜빡이지 않도록 미리 받아둠
Object.values(BATTLE_EFFECTS).forEach(effect => { loadImage(effect.src); });

// 내 쪽/상대 쪽 이펙트 요소를 따로 둠 — 각자 자기 hp바/이름표와 같은 층에 있어야 hp바가 이펙트 위에
// 그려짐(상대 hp바는 배틀 화면 밖 게임 컨테이너에 있어서, 배틀 화면 안의 요소로는 그 아래에 그릴 수 없음)
const battleMoveEffectEl = document.getElementById('battle-move-effect');
const battleFoeMoveEffectEl = document.getElementById('battle-foe-move-effect');
let battleEffectTimerId = null;

function stopBattleEffect() {
    if (battleEffectTimerId !== null) {
        clearInterval(battleEffectTimerId);
        battleEffectTimerId = null;
    }
    battleMoveEffectEl.classList.add('hidden');
    battleFoeMoveEffectEl.classList.add('hidden');
}

// side 쪽 포켓몬 위에 이펙트를 한 번 재생 — 이로치 이펙트와 같은 공통 로직(playFrameEffect)과 같은
// 크기(그 포켓몬의 getEffectSize)를 씀
function playBattleEffect(side, effect, onDone) {
    stopBattleEffect();
    let boxEl, size, bodyHeight;
    if (side === 'player') {
        boxEl = battleBackSpriteBoxEl;
        size = currentBackEffectSize;
        bodyHeight = currentBackEffectBodyHeight;
    } else {
        boxEl = monster;
        const m = getFrontSpriteMetrics(currentMonsterId, currentIsShiny) || {};
        const w = (m.effectW || m.w) || currentMonsterFrameSize;
        const h = (m.effectH || m.h) || currentMonsterFrameSize;
        const pixelScale = currentMonsterFrameSize > 0 ? (currentMonsterDisplaySize / currentMonsterFrameSize) : 1;
        size = getEffectSize(w, h, pixelScale);
        bodyHeight = h * pixelScale;
    }
    const effectEl = side === 'player' ? battleMoveEffectEl : battleFoeMoveEffectEl;
    battleEffectTimerId = playFrameEffect(effectEl, boxEl, size, bodyHeight, effect, () => {
        battleEffectTimerId = null;
        onDone();
    });
}

// ===================== 대화창(액션박스 ⇄ 메시지) =====================

// 메시지 하나를 액션박스 대화창 영역에 타이핑으로 표시하고, 다 표시된 뒤 잠깐 대기했다가 onDone.
// hold: 다 표시된 뒤 대기시간(ms) — 생략하면 BATTLE_MESSAGE_HOLD
function showBattleMessage(text, onDone, hold = BATTLE_MESSAGE_HOLD) {
    battleMainMenuEl.classList.add('hidden');
    battleMoveMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.add('hidden');
    battleMessageBoxEl.classList.remove('hidden');
    const done = battleCallback(onDone);
    typeMessage(battleMessageBoxEl, text, BATTLE_MESSAGE_CHAR_DELAY, () => {
        setTimeout(done, hold);
    });
}

// 교체 가능한 포켓몬이 없으면 "포켓몬" 버튼을 비활성화
function updateBattleSwitchBtnState() {
    const hasCandidate = battleParty.some((entry, idx) =>
        !!entry && idx !== activePartyIndex && !entry.fainted);
    battleSwitchBtn.disabled = !hasCandidate;
}

function showBattleMainMenuUI() {
    battleMoveMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.add('hidden');
    battleMessageBoxEl.classList.add('hidden');
    battleMessageBoxEl.textContent = '';
    battleMainMenuEl.classList.remove('hidden');
    updateBattleSwitchBtnState();
}

// 뒤로가기(‹) 버튼 — left_arrow.png(세로 8프레임)를 0.5배로 계속 반복 재생
const BACK_ARROW_FRAME_COUNT = 8;
const BACK_ARROW_FRAME_HEIGHT = 14; // px — 원본 28px의 절반(표시 배율 0.5배와 동일)
const BACK_ARROW_FRAME_INTERVAL_MS = 120;
(function playBackArrowAnimation() {
    const buttons = [battleMoveBackBtn, battleSwitchInlineBackBtn];
    let frameIndex = 0;
    setInterval(() => {
        frameIndex = (frameIndex + 1) % BACK_ARROW_FRAME_COUNT;
        const y = -(frameIndex * BACK_ARROW_FRAME_HEIGHT);
        buttons.forEach(btn => {
            btn.style.backgroundPosition = `0 ${y}px`;
        });
    }, BACK_ARROW_FRAME_INTERVAL_MS);
})();

// ===================== 공격하기 메뉴 (공격/랭크업/회복 고정 3개) =====================
const BATTLE_ACTIONS = [
    { type: 'attack',  label: '공격' },
    { type: 'rankup',  label: '랭크업' },
    { type: 'heal',    label: '회복' }
];

function renderBattleMoveMenu() {
    battleMoveListEl.innerHTML = '';
    // 공격 버튼 전용 상성 미리보기 — 지금 나가있는 내 포켓몬(공격자) 기준 상대(방어자) 순수 상성.
    // getBaseTypeMultiplier를 씀(단일 타입 보정 typeMult 아님 — matchupIconClass/effMessage와 동일 원칙)
    const myTypes = (POKEMON_DATA[selectedBattleId] || {}).types || [];
    const foeTypes = (POKEMON_DATA[(aiParty[activeAiIndex] || {}).id] || {}).types || [];
    const attackEff = attackEffPreview(getBaseTypeMultiplier(myTypes, foeTypes));

    BATTLE_ACTIONS.forEach(action => {
        const btn = document.createElement('button');
        // "싸운다"/"포켓몬" 버튼(#battle-main-menu)과 완전히 같은 디자인(menu-item)을 그대로 씀
        btn.className = 'menu-item battle-move-btn';
        const eff = action.type === 'attack' ? attackEff : null;
        // 랭크업/회복 버튼도 같은 구조(빈 미리보기 줄)로 만들어서 세 버튼의 세로 정렬이 어긋나지 않게 함
        const effHtml = eff ? (eff.icon ? `<span class="bs-icon ${eff.icon}"></span>` : '') + eff.text : '';
        btn.innerHTML = `<span class="battle-move-label">${action.label}</span>` +
            `<span class="battle-move-eff">${effHtml}</span>`;
        btn.addEventListener('click', () => {
            if (battleTurnBusy) return;
            handlePlayerMoveChosen(action.type);
        });
        battleMoveListEl.appendChild(btn);
    });
}

battleAttackBtn.addEventListener('click', () => {
    if (battleTurnBusy) return;
    renderBattleMoveMenu();
    battleMainMenuEl.classList.add('hidden');
    battleMoveMenuEl.classList.remove('hidden');
});

battleMoveBackBtn.addEventListener('click', () => {
    if (battleTurnBusy) return;
    showBattleMainMenuUI();
});

// ===================== 턴 진행 =====================

// 기절 처리: 기절 연출 → 멘트 → (전멸이면 승패, 아니면 교체) → onDone.
// 실제 게임처럼 먼저 쓰러지고 멘트가 뜨는 순서
function handleFaint(side, onDone) {
    const name = side === 'ai'
        ? `상대 ${(POKEMON_DATA[aiParty[activeAiIndex].id] || {}).name || '???'}`
        : (POKEMON_DATA[selectedBattleId] || {}).name || '???';

    const afterVisual = () => {
        if (side === 'ai') {
            aiParty[activeAiIndex].fainted = true;
            if (!aiParty.some(p => !p.fainted)) {
                battleEnded = true;
                endBattleWithResult(true);
                onDone();
                return;
            }
            // 함께하기: 다음 포켓몬은 상대가 직접 고름(상대 화면의 강제 교체 메뉴) — 그 선택이 올 때까지 대기
            if (isPvpBattle()) { mpWaitForcedSwitch(onDone); return; }
            autoSwitchAiNext(onDone);
        } else {
            battleParty[activePartyIndex].fainted = true;
            if (!battleParty.some(p => !p.fainted)) {
                battleEnded = true;
                endBattleWithResult(false);
                onDone();
                return;
            }
            openForcedSwitch(onDone);
        }
    };

    const showFaintMessage = () => showBattleMessage(`${name}이(가) 쓰러졌다!`, afterVisual);

    if (side === 'ai') {
        playAiFaintAnimation(showFaintMessage);
    } else {
        playPlayerFaintAnimation(showFaintMessage);
    }
}

// 상대(AI)를 지정한 포켓몬으로 내보냄 — 기절 교체와 자진 교체가 같이 씀
function switchAiToIndex(targetIndex, onDone) {
    activeAiIndex = targetIndex;
    aiRank = 0;
    aiHealUses = 0;
    const entry = aiParty[activeAiIndex];
    entry.known = true; // 전장에 나온 순간부터 상태 확인 창에서 정체가 공개됨

    const nextInfo = POKEMON_DATA[entry.id] || { name: '???' };

    showBattleMessage(`상대가 ${nextInfo.name}을(를) 내보냈다!`, () => {
        const monsterObj = partyEntryToMonsterObj(entry);
        const preloadPromise = loadImage(monsterObj.src);

        // hidden을 opacity 0과 같은 시점에 벗겨야 페이드인이 적용됨(display:none에서 바로 바꾸면 트랜지션이 생략됨)
        monster.classList.remove('hidden');
        monsterInfo.classList.remove('hidden');
        monsterInfoText.classList.remove('hidden');
        monster.style.opacity = '0';
        monsterInfo.style.opacity = '0';
        monsterInfoText.style.opacity = '0';

        const fadeOutPromise = new Promise(resolve => setTimeout(resolve, MONSTER_SHRINK_DURATION));

        Promise.all([fadeOutPromise, preloadPromise]).then(battleCallback(() => {
            stopShinyAnimation();
            shinyEffect.classList.add('hidden');
            const spriteEl = monster.querySelector('#monster-sprite');
            if (spriteEl) spriteEl.style.transition = '';
            monster.style.clipPath = '';

            displayMonsterSprite(monster, monsterObj.src, monsterObj.id, () => {
                alignWildMonsterTopToHpBar(monsterObj);
                if (monsterObj.isShiny) playShinyEffect();
            });
            updateMonsterInfo(monsterObj);
            // 체력바는 opacity를 올리기 전에 세팅해야 늦게 채워지지 않음
            aiHpBar.reset(entry.hp);

            monster.style.opacity = '1';
            monsterInfo.style.opacity = '1';
            monsterInfoText.style.opacity = '1';

            setTimeout(battleCallback(() => {
                monster.style.opacity = '';
                monsterInfo.style.opacity = '';
                monsterInfoText.style.opacity = '';
                onDone();
            }), MONSTER_SHRINK_DURATION);
        }));
    });
}

// 기절 뒤 다음 포켓몬 — 자진 교체와 같은 점수(scoreBenchCandidate)로 최고점을 확정적으로 고름(동률이면 앞쪽)
function autoSwitchAiNext(onDone) {
    const foeInfo = POKEMON_DATA[selectedBattleId] || {};
    let bestIdx = -1, bestScore = -Infinity;
    aiParty.forEach((p, idx) => {
        if (p.fainted) return;
        const pInfo = POKEMON_DATA[p.id] || {};
        const score = scoreBenchCandidate(pInfo, 0, p.hp / BATTLE_MON_MAX_HP, foeInfo, playerRank);
        if (score > bestScore) { bestScore = score; bestIdx = idx; }
    });
    switchAiToIndex(bestIdx, onDone);
}

// 내 포켓몬이 기절했을 때 — 자진 교체와 같은 이름 버튼 목록을 쓰되 뒤로가기는 숨김(취소 불가)
function openForcedSwitch(onDone, durationMs = BATTLE_FORCED_SWITCH_TIMEOUT_MS) {
    if (reachSafePoint()) return;
    battleSwitchForced = true;
    pendingForcedSwitchCallback = onDone;
    renderBattleSwitchInlineMenu();
    battleMessageBoxEl.classList.add('hidden');
    battleMessageBoxEl.textContent = '';
    battleMainMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.remove('hidden');
    // 고르는 쪽의 개인 제한시간(혼자하기·함께하기 같은 규칙) — 못 고르면(교체는 "안 함"이 없는 선택이라) 기권
    startBattleTimer(battleTurnTimerEl, durationMs, battleTimeoutForfeit);
}

function battleResultText(didWin) {
    return didWin ? '상대와의 승부에서 이겼다!' : '상대와의 승부에서 졌다!';
}

// 승패는 액션박스 멘트로 먼저 알리고, 멘트가 끝난 뒤 결과 화면을 띄움
function endBattleWithResult(didWin) {
    battleTurnBusy = false;
    // 연출 도중 정상적으로 승패가 났으면 정상 결과가 우선 — 미뤄 둔 종료 멘트는 버림(방은 이미
    // 닫혔으므로 다시하기만 막음)
    battleAnimating = false;
    if (mpPendingTerminal) { mpPendingTerminal = null; battleResultRetryBtn.disabled = true; }
    battleLastDidWin = didWin;
    mpClearPendingSubmission();
    const resultText = battleResultText(didWin);
    showBattleMessage(resultText, () => {
        battleMessageBoxEl.classList.add('hidden');
        battleMessageBoxEl.textContent = '';
        battleResultOverlayEl.classList.remove('hidden');
    }, BATTLE_SCREEN_TRANSITION_HOLD);
}

// 내 포켓몬을 battleParty[targetIndex]로 교체(페이드아웃 → 미리 로드 → 페이드인). 멘트는 호출하는 쪽 책임
function applyPlayerSwitch(targetIndex, onDone) {
    const entry = battleParty[targetIndex];
    // displayBackSprite()가 쓰는 1차 후보 경로를 미리 로드(폴백은 displayBackSprite()가 알아서 재시도)
    const backOff = backSpriteInfo(entry.id, entry.isShiny);
    const preloadPromise = backOff ? loadImage(backOff.src) : Promise.resolve();

    battleBackSpriteBoxEl.style.opacity = '0';
    battleBackInfoEl.style.opacity = '0';
    battleBackInfoTextEl.style.opacity = '0';

    const fadeOutPromise = new Promise(resolve => setTimeout(resolve, MONSTER_SHRINK_DURATION));

    Promise.all([fadeOutPromise, preloadPromise]).then(battleCallback(() => {
        activePartyIndex = targetIndex;
        entry.shown = true; // 상대 화면에 공개됨 — 재접속 스냅샷에서 상대의 상태 확인 창 공개 여부로 씀
        selectedBattleId = entry.id;
        selectedBattleIsShiny = entry.isShiny;
        playerRank = 0;

        // 기절 연출(playPlayerFaintAnimation) 도중 교체했을 수도 있으니, 다음 포켓몬을 그리기 전에
        // transition/땅 라인(clip-path)을 정리 — switchAiToIndex()가 #monster에 하는 것과 동일
        battleBackSpriteEl.style.transition = '';
        battleBackSpriteBoxEl.style.clipPath = '';

        displayBackSprite(battleBackSpriteBoxEl, battleBackSpriteEl, selectedBattleId, selectedBattleIsShiny);
        const backInfo = POKEMON_DATA[selectedBattleId] || { name: '???' };
        battleBackNameEl.textContent = backInfo.name;
        renderShortTypeIcons(battleBackTypesEl, backInfo.types);
        playerHpBar.reset(battleParty[activePartyIndex].hp);

        battleBackSpriteBoxEl.style.opacity = '1';
        battleBackInfoEl.style.opacity = '1';
        battleBackInfoTextEl.style.opacity = '1';

        setTimeout(battleCallback(() => {
            battleBackSpriteBoxEl.style.opacity = '';
            battleBackInfoEl.style.opacity = '';
            battleBackInfoTextEl.style.opacity = '';
            onDone();
        }), MONSTER_SHRINK_DURATION);
    }));
}

// 행동 하나(공격/랭크업/회복/교체)를 적용하고, 연출이 끝나면 onDone(defenderFainted) 호출.
// roll({ hit, crit }): 함께하기에서 양쪽이 같은 판정값을 쓰게 넘겨받음(AI 배틀은 여기서 굴림)
function resolveSingleAction(attackerSide, action, onDone, roll) {
    const isPlayerAttacker = attackerSide === 'player';

    if (action && typeof action === 'object' && 'switch' in action) {
        if (isPlayerAttacker) {
            const targetEntry = battleParty[action.switch];
            const name = (POKEMON_DATA[targetEntry.id] || {}).name || '???';
            showBattleMessage(`${name}(으)로 교체했다!`, () => {
                applyPlayerSwitch(action.switch, () => onDone(false));
            });
        } else {
            switchAiToIndex(action.switch, () => onDone(false));
        }
        return;
    }

    const actionType = action;
    // 제한시간 안에 행동을 못 골라 자동으로 낸 '패스' — 아무 효과 없이 그대로 턴을 흘려보냄
    // (상대는 맞는 건 맞지만 이쪽 공격/교체 등은 실행되지 않음)
    if (actionType === 'pass') { onDone(false); return; }
    const attackerName = isPlayerAttacker
        ? ((POKEMON_DATA[selectedBattleId] || {}).name || '???')
        : `상대 ${(POKEMON_DATA[aiParty[activeAiIndex].id] || {}).name || '???'}`;

    // 공격이 "{공격자}의 공격!"처럼 먼저 선언 멘트를 띄우는 것과 똑같이,
    // 랭크업/회복도 성공/실패 멘트에 앞서 "{공격자}의 랭크업!"/"{공격자}의 회복!"을 먼저 보여줌
    if (actionType === 'rankup') {
        showBattleMessage(`${attackerName}의 랭크업!`, () => {
            const rankBefore = isPlayerAttacker ? playerRank : aiRank;
            if (rankBefore >= BATTLE_RANK_MAX) {
                showBattleMessage(`${attackerName}의 공격은 더 이상 오르지 않는다!`, () => onDone(false));
                return;
            }
            if (isPlayerAttacker) playerRank++; else aiRank++;
            // 올릴 수 있을 때만 칼춤 이펙트를 보여준 뒤 멘트
            playBattleEffect(attackerSide, BATTLE_EFFECTS.SWORDS_DANCE, () => {
                showBattleMessage(`${attackerName}의 공격이 올랐다!`, () => onDone(false));
            });
        });
        return;
    }

    if (actionType === 'heal') {
        showBattleMessage(`${attackerName}의 회복!`, () => {
            const entry = isPlayerAttacker ? battleParty[activePartyIndex] : aiParty[activeAiIndex];
            if (entry.hp >= BATTLE_MON_MAX_HP) {
                showBattleMessage(`${attackerName}은(는) 이미 체력이 가득하다!`, () => onDone(false));
                return;
            }
            if (!isPlayerAttacker) aiHealUses++;
            const from = entry.hp;
            const to = Math.min(BATTLE_MON_MAX_HP, from + Math.round(BATTLE_MON_MAX_HP * BATTLE_HEAL_FRACTION));
            entry.hp = to;
            // 공격과 같은 순서 — HP가 먼저 차오른 뒤 성공 멘트
            const showHealSuccess = () => showBattleMessage(`${attackerName}은(는) 체력을 회복했다!`, () => onDone(false));
            // HP회복 이펙트가 끝난 뒤 HP가 차오름
            playBattleEffect(attackerSide, BATTLE_EFFECTS.RECOVER, () => {
                if (isPlayerAttacker) playerHpBar.animate(from, to, showHealSuccess);
                else aiHpBar.animate(from, to, showHealSuccess);
            });
        });
        return;
    }

    // 공격 — 타입은 공격하는 포켓몬 자신의 타입을 그대로 씀
    const defenderSide = isPlayerAttacker ? 'ai' : 'player';
    const attackerTypes = isPlayerAttacker
        ? ((POKEMON_DATA[selectedBattleId] || {}).types || [])
        : ((POKEMON_DATA[aiParty[activeAiIndex].id] || {}).types || []);
    const defenderTypes = isPlayerAttacker
        ? ((POKEMON_DATA[aiParty[activeAiIndex].id] || {}).types || [])
        : ((POKEMON_DATA[selectedBattleId] || {}).types || []);
    // 공격 대상 이름 표기 — 상대 포켓몬이면 "상대 {이름}", 내 포켓몬이면 접두사 없음(다른
    // 멘트들과 통일). 빗나감 멘트와 효과없음(면역) 멘트가 공통으로 씀
    const defenderName = defenderSide === 'ai'
        ? `상대 ${(POKEMON_DATA[aiParty[activeAiIndex].id] || {}).name || '???'}`
        : ((POKEMON_DATA[selectedBattleId] || {}).name || '???');

    showBattleMessage(`${attackerName}의 공격!`, () => {
        // 명중률: 랭크업/회복(자기 자신 대상)과 달리 공격만 빗나갈 수 있음(실제 포켓몬과 동일).
        // 빗나가면 데미지 계산 자체를 건너뛰고 바로 턴을 넘김 — 원작처럼 공격 연출 없이 멘트만 띄움
        const isHit = roll ? roll.hit : Math.random() < BATTLE_ACCURACY;
        if (!isHit) {
            showBattleMessage(`${defenderName}에게는 맞지 않았다!`, () => onDone(false));
            return;
        }

        const baseMult = getBaseTypeMultiplier(attackerTypes, defenderTypes);
        const typeMult = getAttackEffectiveness(attackerTypes, defenderTypes);
        const rankMult = rankMultiplier(isPlayerAttacker ? playerRank : aiRank);
        // 치명타: 상성이 면역(0배)이면 데미지가 어차피 0이라 실제 게임처럼 아예 굴리지 않음
        const isCrit = baseMult > 0 && (roll ? roll.crit : Math.random() < BATTLE_CRIT_CHANCE);
        const critMult = isCrit ? BATTLE_CRIT_MULT : 1;
        // 공격자 자신의 종족치(bst, 원본 — 이로치/CP 배율 미적용) 기반 데미지 보너스를
        // 기준 데미지(20)에 더함 — getDamageBonus() 참고
        const attackerInfo = isPlayerAttacker
            ? (POKEMON_DATA[selectedBattleId] || { bst: 0, category: 'normal' })
            : (POKEMON_DATA[aiParty[activeAiIndex].id] || { bst: 0, category: 'normal' });
        const dmgBonus = getDamageBonus(attackerInfo.bst, attackerInfo.category);
        const dmg = Math.round((BATTLE_BASE_DAMAGE + dmgBonus) * typeMult * rankMult * critMult);

        const afterDamage = () => {
            let effMessage = null;
            // 상성 멘트 5단계 — 순수 상성(baseMult)만 봄(보정·치명타 제외)
            if (baseMult === 0) {
                effMessage = `${defenderName}에게는 효과가 없는 것 같다...`;
            } else if (baseMult >= 4) effMessage = '효과가 매우 굉장했다!!';
            else if (baseMult > 1) effMessage = '효과가 굉장했다!';
            else if (baseMult <= 0.25) effMessage = '효과가 매우 별로인 듯 하다...';
            else if (baseMult < 1) effMessage = '효과가 별로인 듯하다...';

            const proceed = () => {
                const fainted = defenderSide === 'ai'
                    ? aiParty[activeAiIndex].hp <= 0
                    : battleParty[activePartyIndex].hp <= 0;
                if (!fainted) { onDone(false); return; }
                handleFaint(defenderSide, () => onDone(true));
            };

            if (effMessage) showBattleMessage(effMessage, proceed);
            else proceed();
        };

        // 치명타 멘트는 상성 멘트보다 먼저 뜨는 게 실제 게임 순서 — 위에서 면역이면 isCrit
        // 자체가 false로 고정되므로 이 분기는 안 탐
        const afterHpAnim = isCrit
            ? () => showBattleMessage('급소에 맞았다!', afterDamage)
            : afterDamage;

        const applyDamage = () => {
            if (defenderSide === 'ai') {
                const from = aiParty[activeAiIndex].hp;
                const to = Math.max(0, from - dmg);
                aiParty[activeAiIndex].hp = to;
                aiHpBar.animate(from, to, afterHpAnim);
            } else {
                const from = battleParty[activePartyIndex].hp;
                const to = Math.max(0, from - dmg);
                battleParty[activePartyIndex].hp = to;
                playerHpBar.animate(from, to, afterHpAnim);
            }
        };

        // 원작은 명중 판정·면역 판정을 통과했을 때만 기술 애니메이션을 재생하므로, 효과가 없으면(면역)
        // 돌진·점멸 없이 바로 멘트로 넘어감
        if (baseMult === 0) applyDamage();
        else playAttackLunge(attackerSide, () => playHitBlink(defenderSide, applyDamage));
    });
}

// 한 턴 진행(순서는 startPlayerTurn이 정함). 선공 공격으로 후공이 기절하면 후공은 움직이지 않음.
// rolls: 함께하기에서만 넘어오는 { player, ai } 판정값
function runTurnSequence(order, actions, rolls) {
    const [first, second] = order;
    resolveSingleAction(first, actions[first], (defenderFainted) => {
        if (battleEnded) return;
        if (defenderFainted) { finishTurn(); return; }
        resolveSingleAction(second, actions[second], () => {
            if (battleEnded) return;
            finishTurn();
        }, rolls && rolls[second]);
    }, rolls && rolls[first]);
}

// 배틀 액션 개인 제한시간(혼자하기·함께하기 공통) — 놓치면 패스, 연속 2번째면 기권
function startMyActionDeadline(durationMs = BATTLE_ACTION_TIMEOUT_MS) {
    if (!battlePreviewActive || battleEnded) return;
    startBattleTimer(battleTurnTimerEl, durationMs, () => {
        if (!battlePreviewActive || battleEnded) return;
        // 함께하기에서 내가 이미 행동을 보내고 상대 메시지를 기다리는 중(mpAwaitingOpponentAction)이면,
        // 상대 시계는 연출 길이 차이만큼 늦게 시작했을 수 있으므로 여유를 더 준 뒤 생존 여부를 판정
        if (isPvpBattle() && mpAwaitingOpponentAction) { window.mpPeerSlackThenJudge(); return; }
        // 연속 2번째 시간 초과면 그 턴을 시작하지 않고 곧바로 기권(상대 화면에 턴이 진행되지 않음)
        selfPassStreak++;
        if (selfPassStreak >= 2) { battleTimeoutForfeit(); return; }
        startPlayerTurn('pass');
    });
}

// 내 제한시간 초과로 기권 — 함께하기는 방에 end를 기록, 혼자하기는 같은 종료 멘트를 바로 띄움.
// 파티 선택 단계는 battleMode가 정해지기 전이라 mp.active로 구분
function battleTimeoutForfeit() {
    if (mp.active) { window.mpForfeit(); return; }
    clearBattleTimer();
    const info = { reason: 'forfeit', iLost: true };
    if (battlePreviewActive) { if (!battleEnded) showBattleTerminal(info); return; }
    if (dexPickerMode) onBattleTerminal(info);
}

function finishTurn() {
    if (reachSafePoint()) return;
    battleTurnBusy = false;
    showBattleMainMenuUI();
    startMyActionDeadline();
}

// 내 행동이 정해졌을 때의 공통 진입점 — AI 행동도 고르고 순서를 정해 턴을 진행.
// 교체는 항상 싸우기보다 먼저, 둘 다 교체면 랜덤
function startPlayerTurn(playerAction) {
    // 타이머는 지우지 않음 — 상대를 기다리는 동안에도 계속 흐르고, 다음 턴이 새 타이머로 덮어씀
    if (playerAction !== 'pass') selfPassStreak = 0;
    // 혼자하기는 AI가 그 자리에서 응답하므로 기다릴 상대가 없음 — 턴 연출 중에 타이머가 만료되지 않게 바로 지움
    // (다음 메뉴가 뜰 때 finishTurn이 새로 시작)
    if (!isPvpBattle()) clearBattleTimer();
    battleTurnBusy = true;
    battleMoveMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.add('hidden');

    // 상대가 사람이면 AI 대신 상대의 선택을 네트워크로 기다림(mpSubmitTurnAction)
    if (isPvpBattle()) { mpAwaitingOpponentAction = true; mpSubmitTurnAction(playerAction); return; }

    const aiEntry = aiParty[activeAiIndex];
    const playerHp = battleParty[activePartyIndex].hp;
    const aiAction = pickAiTurnAction(aiEntry, selectedBattleId, playerHp);

    const isSwitch = (a) => !!(a && typeof a === 'object' && 'switch' in a);
    const playerIsSwitch = isSwitch(playerAction);
    const aiIsSwitch = isSwitch(aiAction);

    let order;
    if (playerIsSwitch && aiIsSwitch) order = Math.random() < 0.5 ? ['player', 'ai'] : ['ai', 'player'];
    else if (playerIsSwitch) order = ['player', 'ai'];
    else if (aiIsSwitch) order = ['ai', 'player'];
    else order = Math.random() < 0.5 ? ['player', 'ai'] : ['ai', 'player'];

    runTurnSequence(order, { player: playerAction, ai: aiAction });
}

// 기술(공격/랭크업/회복) 선택 버튼을 눌렀을 때
function handlePlayerMoveChosen(actionType) {
    if (battleTurnBusy) return;
    startPlayerTurn(actionType);
}

// 액션박스를 타이핑 없는 고정 문구(불러오는 중 — 혼자하기·함께하기 공통, 통신 대기 중 — 함께하기)로 바꿈 — 다음 멘트가 덮어씀
function showBattleWaiting(text) {
    cancelTypeMessage(battleMessageBoxEl);
    battleMainMenuEl.classList.add('hidden');
    battleMoveMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.add('hidden');
    battleMessageBoxEl.classList.remove('hidden');
    battleMessageBoxEl.textContent = text;
}

// ===================== 함께하기(pvp) 동기화 =====================
// 이번 턴의 랜덤 판정 — 양쪽이 공개한 난수를 합쳐서 정하므로 결과가 같고 어느 쪽도 조작할 수 없음
function mpRollTurn(hostNonce, guestNonce, turn) {
    const u = window.mpSeededUniforms(`${hostNonce}|${guestNonce}|${turn}`);
    return {
        first: u[0] < 0.5 ? 'host' : 'guest',
        host: { hit: u[1] < BATTLE_ACCURACY, crit: u[2] < BATTLE_CRIT_CHANCE },
        guest: { hit: u[3] < BATTLE_ACCURACY, crit: u[4] < BATTLE_CRIT_CHANCE }
    };
}

// 턴 시작 시점의 배틀 상태를 호스트 기준(host/guest 순서)의 짧은 문자열로 — 양쪽이 commit에 실어
// 보내 서로 비교함(같은 계산을 각자 돌리는 구조라 어긋나면 이후 결과가 계속 달라지므로 바로 잡아야 함)
function mpSideState(party, activeIdx, rank) {
    return `${activeIdx}:${rank}:` + party.map(p => `${p.hp}${p.fainted ? 'x' : ''}`).join(',');
}
function mpStateString() {
    const mine = mpSideState(battleParty, activePartyIndex, playerRank);
    const theirs = mpSideState(aiParty, activeAiIndex, aiRank);
    return mp.isHost ? `${mine}/${theirs}` : `${theirs}/${mine}`;
}

// 상태가 어긋났을 때 — 호스트 상태를 정답으로 보고 게스트가 hp·기절·랭크를 맞춤(hp바도 즉시 갱신).
// 출전 중인 포켓몬 자체가 다르면 화면 연출까지 달라진 것이라 맞출 수 없음 → false
function mpApplyHostState(hostState) {
    if (mp.isHost) return true; // 호스트는 자기 상태가 정답
    const parse = (side) => {
        const [active, rank, list] = side.split(':');
        return { active: Number(active), rank: Number(rank), mons: list.split(',').map(t => ({ hp: parseFloat(t), fainted: t.endsWith('x') })) };
    };
    const [hostSide, guestSide] = String(hostState || '').split('/').map(parse);
    if (!hostSide || !guestSide) return false;
    const apply = (party, side) => {
        if (side.mons.length !== party.length || side.mons.some(m => Number.isNaN(m.hp))) return false;
        party.forEach((p, i) => { p.hp = side.mons[i].hp; p.fainted = side.mons[i].fainted; });
        return true;
    };
    if (hostSide.active !== activeAiIndex || guestSide.active !== activePartyIndex) return false;
    if (!apply(aiParty, hostSide) || !apply(battleParty, guestSide)) return false;
    aiRank = hostSide.rank;
    playerRank = guestSide.rank;
    aiHpBar.reset(aiParty[activeAiIndex].hp);
    playerHpBar.reset(battleParty[activePartyIndex].hp);
    updateBattleSwitchBtnState();
    return true;
}

// 맞출 수 없는 동기화 오류 — 더 진행하면 양쪽 화면이 계속 달라지므로 끊김으로 정리
function mpDesync(reason) {
    console.error('함께하기 동기화 오류:', reason);
    window.mpForceDisconnect();
}

// 상대가 보낸 행동이 지금 상태에서 말이 되는지 확인 — 이상하면 공격으로 대체(양쪽 상태가 같으면
// 정상 클라이언트끼리는 절대 대체되지 않음)
function mpSanitizeAction(action) {
    if (action === 'attack' || action === 'rankup' || action === 'heal' || action === 'pass') return action;
    if (action && typeof action === 'object' && Number.isInteger(action.switch)) {
        const target = aiParty[action.switch];
        if (target && !target.fainted && action.switch !== activeAiIndex) return { switch: action.switch };
    }
    console.warn('함께하기: 상대 행동이 현재 상태와 맞지 않아 공격으로 대체함', action);
    return 'attack';
}

// 상대가 보낸 파티를 배틀용 엔트리로 — 모르는 id는 걸러내고 최대 3마리
function mpSanitizeParty(list) {
    let arr = [];
    if (Array.isArray(list)) arr = list;
    else if (list && typeof list === 'object') arr = Object.values(list);
    
    return arr
        .filter(p => p && POKEMON_DATA[p.id])
        .slice(0, 3)
        .map(p => ({ id: p.id, isShiny: !!p.isShiny, hp: BATTLE_MON_MAX_HP, fainted: false, known: false }));
}

// 내 행동을 commit-reveal로 교환: commit(행동+난수의 해시, 턴 시작 상태) → 상대 commit 오면 reveal →
// 상대 reveal의 해시를 확인하고 양쪽 난수로 판정해 진행
function mpSubmitTurnAction(playerAction, nonceOverride) {
    const turn = mpTurn;
    const nonce = nonceOverride || window.mpRandomNonce();
    mpPendingSubmission = { turn, action: playerAction, nonce };
    mpSavePendingSubmission();
    const commitOf = (action, n) => window.mpSha256Hex(`${turn}|${JSON.stringify(action)}|${n}`);
    const myState = mpStateString();
    mpSend('commit', { turn, c: commitOf(playerAction, nonce), st: myState });
    showBattleWaiting('통신 대기 중...');
    mpWaitFor('commit', battleCallback((oppCommit) => {
        if (!oppCommit || oppCommit.turn !== turn) { mpDesync(`턴 번호 불일치(${turn} vs ${oppCommit && oppCommit.turn})`); return; }
        mpPeerCommitTurn = turn;
        if (oppCommit.st !== myState) {
            console.warn('함께하기: 턴 시작 상태가 달라 호스트 기준으로 맞춤', myState, oppCommit.st);
            if (!mpApplyHostState(mp.isHost ? myState : oppCommit.st)) { mpDesync('상태를 맞출 수 없음'); return; }
        }
        mpSend('reveal', { turn, action: playerAction, nonce });
        mpWaitFor('reveal', battleCallback((oppReveal) => {
            if (!oppReveal || oppReveal.turn !== turn || typeof oppReveal.nonce !== 'string' ||
                commitOf(oppReveal.action, oppReveal.nonce) !== oppCommit.c) {
                mpDesync('reveal이 commit과 다름');
                return;
            }
            mpTurn = turn + 1;
            const rolls = mp.isHost ? mpRollTurn(nonce, oppReveal.nonce, turn) : mpRollTurn(oppReveal.nonce, nonce, turn);
            mpResolveTurn(playerAction, mpSanitizeAction(oppReveal.action), rolls);
        }));
    }));
}

// 양쪽 행동+판정값으로 순서를 정해 턴을 진행 — 순서 규칙은 AI 배틀(startPlayerTurn)과 동일
// (교체가 싸우기보다 먼저, 나머지는 50:50). host/guest를 내 화면 기준 player/ai로 바꿔 씀
function mpResolveTurn(myAction, oppAction, rolls) {
    mpAwaitingOpponentAction = false;
    mpClearPendingSubmission();
    // 상대 메시지가 왔으니 내 타이머를 바로 지움 — 애니메이션 도중 만료되어 끝난 턴에 동작하는 것을 막음
    clearBattleTimer();
    // 상대 패스 연속 횟수(안전장치 — 정상이면 2번째엔 기권을 보내옴)
    if (oppAction === 'pass') {
        mpMissStreak++;
        if (mpMissStreak >= 2) { window.mpDeclarePeerForfeit(); return; }
    } else {
        mpMissStreak = 0;
    }

    const me = mp.isHost ? 'host' : 'guest';
    const opp = mp.isHost ? 'guest' : 'host';
    const isSwitch = (a) => !!(a && typeof a === 'object' && 'switch' in a);
    const myIsSwitch = isSwitch(myAction);
    const oppIsSwitch = isSwitch(oppAction);

    let order;
    if (myIsSwitch === oppIsSwitch) order = rolls.first === me ? ['player', 'ai'] : ['ai', 'player'];
    else order = myIsSwitch ? ['player', 'ai'] : ['ai', 'player'];

    battleAnimating = true;
    runTurnSequence(order, { player: myAction, ai: oppAction }, { player: rolls[me], ai: rolls[opp] });
}

// 상대 포켓몬이 기절했을 때 — 상대가 강제 교체 메뉴에서 고른 포켓몬이 올 때까지 기다렸다가 내보냄
function mpWaitForcedSwitch(onDone) {
    if (reachSafePoint()) return;
    mpAwaitingForcedSwitch = true;
    showBattleWaiting('통신 대기 중...');
    // 이 쪽은 항상 "상대의 선택을 기다리는" 상황이라 제한시간이 다 되면 여유를 더 준 뒤 판정
    startBattleTimer(battleTurnTimerEl, BATTLE_FORCED_SWITCH_TIMEOUT_MS, () => {
        window.mpPeerSlackThenJudge();
    });
    mpWaitFor('forcedSwitch', battleCallback((data) => {
        clearBattleTimer();
        mpAwaitingForcedSwitch = false;
        battleAnimating = true;
        let idx = data && data.idx;
        const target = aiParty[idx];
        if (!target || target.fainted) idx = aiParty.findIndex(p => !p.fainted);
        switchAiToIndex(idx, onDone);
    }));
}

// 배틀 시작 전 프리로드(혼자하기·함께하기 공통) — 내 3마리 뒷모습(폼 전용이 없으면 종 기준형), 내/상대 6마리
// 앞모습(상대 등장·상태 확인 창), 상태 확인 창의 물음표 이미지. 그림별 제한은 두지 않고 전체 불러오기 제한시간
// (BATTLE_LOADED_TIMEOUT_MS, 넘으면 승패 없는 끊김 종료)이 기준 — 느린 그림은 도착할 때까지 기다리고,
// 파일이 없거나 오류로 받지 못한 그림(false)만 기다리지 않고 넘어감. 아래 값은 전체 제한보다 살짝 길게 잡은 안전값
const BATTLE_PRELOAD_TIMEOUT_MS = BATTLE_LOADED_TIMEOUT_MS + 5000;
const battleLoadImage = (src) => loadImage(src, BATTLE_PRELOAD_TIMEOUT_MS);
// 포켓몬 그림 말고도 대결 화면에서 쓰는 그림(CSS 배경·이펙트) — 처음 화면에 필요해지는 순간 받으면 첫 대결에서
// 상성 아이콘·HP 바·이펙트가 늦게 뜰 수 있어서 불러오기 단계에서 같이 받음(합쳐서 약 55KB)
const BATTLE_PRELOAD_UI_SRCS = [
    'images/pokemon/layout/judgment.png',         // 상성 아이콘(기술 버튼·상태 확인 창)
    'images/pokemon/layout/types_short.png',      // 이름표·교체 메뉴 타입 아이콘
    'images/pokemon/layout/types.png',            // 상태 확인 창 타입 뱃지
    'images/pokemon/layout/overlay_hp_back.png',  // HP 바
    'images/pokemon/layout/overlay_hp.png',
    'images/pokemon/layout/action_box.png',       // 액션박스 테두리
    'images/pokemon/layout/left_arrow.png',       // 기술·교체 메뉴 뒤로가기
    'images/pokemon/layout/icon_signal.png',      // 신호 아이콘
    'images/pokemon/layout/icon_nosignal.png',
    BATTLE_EFFECTS.SWORDS_DANCE.src,              // 랭크업·회복 이펙트
    BATTLE_EFFECTS.RECOVER.src
];
function preloadBattleAssets() {
    const jobs = [battleLoadImage(STATUS_UNKNOWN_SPRITE_SRC)];
    BATTLE_PRELOAD_UI_SRCS.forEach(src => jobs.push(battleLoadImage(src)));
    // 이로치 반짝임(shiny.png)은 약 900KB라 양쪽 파티에 이로치가 있을 때만
    if (battleParty.concat(aiParty).some(entry => entry && entry.isShiny)) jobs.push(battleLoadImage(SHINY_EFFECT_SRC));
    battleParty.forEach(entry => {
        const info = backSpriteInfo(entry.id, entry.isShiny);
        if (info) {
            jobs.push(battleLoadImage(info.src).then(ok => {
                // 대체 그림은 파일이 없을 때(false)만 — 느려서 시간 초과(null)면 같은 그림을 계속 받는 중이므로 기다리지 않음
                const fallback = ok === false && baseBackSpriteInfo(entry.id, entry.isShiny);
                return fallback ? battleLoadImage(fallback.src) : ok;
            }));
        }
    });
    battleParty.concat(aiParty).forEach(entry => jobs.push(battleLoadImage(frontSpriteSrc(entry.id, entry.isShiny))));
    return Promise.all(jobs);
}

// 함께하기 대전 종료 멘트 — 항복: "항복으로 대전이 중지되었습니다" → 이겼다/졌다, 끊김: 끊김 멘트 하나.
// 진행 중인 연출·대기 콜백을 전부 끊고(세션 교체) 멘트 후 결과 화면으로. 별도 알림창은 없음
function battleTerminalText(info) {
    return info.reason === 'forfeit' ? '항복으로 대전이 중지되었습니다' : '상대와의 통신이 끊어졌습니다';
}

function showBattleTerminal(info) {
    battleSessionId++;
    closeBattleStatus();
    cancelAttackAnimations();
    stopBattleEffect();
    aiHpBar.cancel();
    playerHpBar.cancel();
    battleAnimating = false;
    mpPendingTerminal = null;
    battleEnded = true;
    battleTurnBusy = true;
    battleSwitchForced = false;
    pendingForcedSwitchCallback = null;
    const showResult = () => {
        battleMessageBoxEl.classList.add('hidden');
        battleMessageBoxEl.textContent = '';
        battleResultOverlayEl.classList.remove('hidden');
    };
    if (info.reason === 'forfeit') {
        showBattleMessage(battleTerminalText(info), () => {
            showBattleMessage(battleResultText(!info.iLost), showResult, BATTLE_SCREEN_TRANSITION_HOLD);
        });
    } else {
        showBattleMessage(battleTerminalText(info), showResult, BATTLE_SCREEN_TRANSITION_HOLD);
    }
}

// 안전 지점(finishTurn/openForcedSwitch/mpWaitForcedSwitch/첫 등장 연출 끝)에 도착했을 때 부름 —
// 미뤄 둔 종료가 있으면 메뉴를 여는 대신 종료 멘트를 띄우고 true를 돌려줌(호출한 쪽은 그대로 멈춤)
function reachSafePoint() {
    battleAnimating = false;
    if (!isPvpBattle()) return false;
    if (mpPendingTerminal) {
        showBattleTerminal(mpPendingTerminal);
        return true;
    }
    // 상대가 돌아와 재동기화를 기다리는 중이면, 호출한 쪽이 메뉴·타이머까지 다 띄운 뒤(같은 틱의
    // 끝) 그 상태 그대로 스냅샷을 보냄 — 흐름은 멈추지 않음
    if (mpPendingResync) setTimeout(mpDoResync, 0);
    return false;
}

// 대전이 더 이어질 수 없게 됐을 때(함께하기는 pokemon_multiplayer.js가 mpOnTerminal 훅으로 부르고,
// 혼자하기 선택창의 시간 초과도 직접 부름) — 지금 화면(배틀·결과 화면 / 선택창)에 맞게 안내함
function onBattleTerminal(info) {
    clearBattleTimer();
    if (isPvpBattle() && battlePreviewActive) {
        // 상대가 없으니 다시하기 비활성화, 대기 중이었다면 종료 안내로 바꿈
        battleResultRetryBtn.disabled = true;
        if (mpRematchWaiting) battleResultRetryBtn.textContent = battleTerminalText(info);
        mpRematchWaiting = false;
        if (battleEnded) return; // 이미 승패가 났으면(결과 화면) 버튼만 바꾸고 끝
        // 턴 연출 중이면 연출이 끝나는 안전 지점까지 미룸(그 사이 다음 턴은 절대 시작되지 않음 —
        // 구독이 이미 끊겼으므로). 메뉴 선택 중·응답 대기 중이면 즉시
        if (battleAnimating) { mpPendingTerminal = info; return; }
        showBattleTerminal(info);
        return;
    }
    // 선택창(도감 선택 모드)에서 끝나면 — 선택 완료(또는 대기 중) 자리에 종료 안내를 띄우고
    // (랜덤 선택은 숨김) 잠시 후 시작화면으로. 아직 대전 전이라 승패 멘트는 없음
    if (dexPickerMode) {
        mpPartyLocked = true;
        mpPickerEndText = battleTerminalText(info);
        renderBattleSlots();
        setTimeout(() => {
            if (!mpPickerEndText || !dexPickerMode) return; // 그 사이 직접 ×로 닫았으면 무시
            stopDexInfoSpriteAnimation();
            dexModal.classList.add('hidden');
            dexPickerMode = false;
            battleParty = [];
            mpPartyLocked = false;
            mpPickerEndText = null;
            dexBattleRandomBtn.classList.remove('hidden');
            battleSlotController.stopAll();
            window.mpClearSignalFreeze();
            // 재접속으로 복원된 선택창이면 뒤의 시작화면이 꺼져 있음 — 직접 켜서 흰 화면이 남지 않게
            startScreen.classList.remove('hidden');
        }, MP_PICKER_DISCONNECT_HOLD_MS);
        return;
    }
}
window.mpOnTerminal = onBattleTerminal;

// ===================== 함께하기 재접속(새로고침 후 복귀) =====================
// 남은 쪽이 안전 지점에서 상태 스냅샷을 보내고 돌아온 쪽은 그대로 화면을 복원함.
// 제한시간·연속 시간 초과 횟수는 이어받고, 이미 낸 행동은 확정(복구 못 하면 그 턴은 패스)

// 이미 낸 행동을 탭 저장소(새로고침용)와 계정 기록(activeRoom/pending — 창 닫기·다른 기기용) 두 곳에 둠
function mpSavePendingSubmission() {
    if (!mpPendingSubmission) return;
    const record = { code: mp.roomCode, role: window.mpMyRole(), ...mpPendingSubmission };
    try {
        sessionStorage.setItem(MP_PENDING_SUBMISSION_KEY, JSON.stringify(record));
    } catch (e) { /* 저장소를 못 쓰면 복구만 못 할 뿐 게임은 진행됨 */ }
    window.mpSaveRemotePending(record);
}
// 복원 순서: 탭 저장소 → 계정 기록. 방·역할이 맞아야 씀(턴 번호는 쓰는 쪽이 확인)
function mpLoadPendingSubmission() {
    const valid = (v) => v && v.code === mp.roomCode && v.role === window.mpMyRole() && typeof v.nonce === 'string';
    try {
        const v = JSON.parse(sessionStorage.getItem(MP_PENDING_SUBMISSION_KEY) || 'null');
        if (valid(v)) return v;
    } catch (e) { /* 무시 */ }
    return valid(window.mpRejoinPending) ? window.mpRejoinPending : null;
}
function mpClearPendingSubmission() {
    const had = !!mpPendingSubmission;
    mpPendingSubmission = null;
    try { sessionStorage.removeItem(MP_PENDING_SUBMISSION_KEY); } catch (e) { /* 무시 */ }
    if (had) window.mpClearRemotePending(); // 턴이 진행되면 계정 기록도 지움(낸 행동이 있었을 때만 — 쓰기 횟수 절약)
}

// 지금 어느 단계인지(스냅샷 기준)
function mpCurrentPhase() {
    if (dexPickerMode) return 'picker';
    if (!battlePreviewActive || !isPvpBattle()) return null;
    if (battleEnded) return 'result';
    if (mpLoadingPhase) return 'loading';
    return 'battle';
}

// 남은 쪽: 지금 상태의 스냅샷(보내는 쪽 기준 — me = 나, opp = 돌아온 상대)
function mpBuildSnapshot() {
    const phase = mpCurrentPhase();
    const snap = { v: 1, phase, remainingMs: battleTimerRemaining() };
    if (phase === 'picker') {
        // 상대가 이미 선택 완료해서 보낸 파티가 아직 내 대기열에 있으면 돌려줌(상대는 "대기 중"으로 복원)
        const peerParty = window.mpPeekInbox('party');
        if (peerParty) snap.yourParty = mpSanitizeParty(peerParty).map(p => ({ id: p.id, isShiny: p.isShiny }));
        return snap;
    }
    const side = (party, active, rank, knownOf) => ({
        party: party.map((p, i) => ({ id: p.id, isShiny: !!p.isShiny, hp: p.hp, fainted: !!p.fainted, known: knownOf(p, i) })),
        active, rank
    });
    snap.turn = mpTurn;
    // 내 포켓몬 중 상대에게 공개된 것(전장에 나온 적 있음)만 known — 상대의 상태 확인 창 공개 여부
    snap.me = side(battleParty, activePartyIndex, playerRank, (p, i) => !!p.shown || i === activePartyIndex || !!p.fainted);
    snap.opp = side(aiParty, activeAiIndex, aiRank, () => true);
    snap.missStreak = mpMissStreak;
    snap.selfPassStreak = selfPassStreak;
    if (phase === 'result') {
        snap.didWin = battleLastDidWin;
        // 상대(돌아온 쪽)가 나가기 전에 누른 다시하기가 아직 내 대기열에 있으면, 그 요청의 남은 시간을 돌려줌 —
        // 내가 받은 뒤 지난 시간으로 계산(기기 시계가 달라도 맞도록 "몇 초 남음"으로 주고받음). 상대는 "대기 중"으로 복원
        const rematchAge = window.mpInboxAge('rematch');
        if (rematchAge !== null) snap.yourRematchRemainingMs = Math.max(0, MP_REMATCH_TIMEOUT_MS - rematchAge);
        return snap;
    }
    if (phase === 'battle') {
        snap.sub = battleSwitchForced ? 'forcedMine'
            : mpAwaitingForcedSwitch ? 'forcedYours'
            : mpAwaitingOpponentAction ? 'awaiting' : 'menu';
        const inboxCommit = window.mpPeekInbox('commit');
        snap.peerCommitted = mpPeerCommitTurn === mpTurn || !!(inboxCommit && inboxCommit.turn === mpTurn);
    }
    return snap;
}

// 남은 쪽: 상대가 돌아와 재동기화를 요청함 — 턴 연출 중이면 안전 지점(reachSafePoint)까지 미룸
mpOnRejoinRequest = () => {
    mpPendingResync = true;
    if (!battleAnimating) mpDoResync();
};

// 남은 쪽: 스냅샷을 새 채널로 보내고, 내가 이미 보냈던 메시지를 새 채널로 다시 보냄
// (파티·로딩 완료·재대결 요청, 이미 낸 행동은 같은 값으로 교환을 처음부터)
function mpDoResync() {
    if (!mpPendingResync || !mp.active || battleAnimating) return;
    if (!window.mpHasPendingRejoin()) { mpPendingResync = false; return; }
    const phase = mpCurrentPhase();
    if (!phase) return;
    mpPendingResync = false;
    const snap = mpBuildSnapshot();
    if (!window.mpPerformResync(snap)) return;
    if (phase === 'picker' && mpPartyLocked) mpSend('party', battleParty.map(p => ({ id: p.id, isShiny: !!p.isShiny })));
    if (phase === 'loading' && mpMyLoadSent) mpSend('loaded');
    if (phase === 'result' && mpRematchWaiting) mpSend('rematch');
    if (phase === 'battle' && mpAwaitingOpponentAction && mpPendingSubmission && mpPendingSubmission.turn === mpTurn) {
        window.mpDropWaiters(['commit', 'reveal']);
        mpPeerCommitTurn = -1;
        mpSubmitTurnAction(mpPendingSubmission.action, mpPendingSubmission.nonce);
    }
}

// 돌아온 쪽: 스냅샷으로 화면 복원 — 파티 선택·로딩은 기존 흐름에 그대로 다시 들어가고, 배틀 중간·결과
// 화면은 등장 연출 없이 바로 그림. 복원하면 true
mpOnSnapshot = (s) => {
    // 복원 도중 오류가 나면(스냅샷 이상 등) 반쯤 그린 대결 화면을 치움 — 실패하면 호출한 쪽이 방을 나가고
    // 시작화면을 띄우는데, 그 위에 대결·결과 화면이 겹쳐 남지 않게
    try {
        return mpApplySnapshot(s);
    } catch (e) {
        if (battlePreviewActive) resetBattlePreview();
        throw e;
    }
};

function mpApplySnapshot(s) {
    if (!s || !s.phase) return false;
    const remain = (fallback) => Math.max(MP_RESUME_MIN_MS, typeof s.remainingMs === 'number' ? s.remainingMs : fallback);
    const validParty = (list) => Array.isArray(list) && list.length === 3 && list.every(p => p && POKEMON_DATA[p.id]);

    if (s.phase === 'picker') {
        openBattlePartyPicker(remain(BATTLE_PARTY_TIMEOUT_MS));
        if (validParty(s.yourParty)) {
            battleParty = s.yourParty.map(p => ({ id: p.id, isShiny: !!p.isShiny }));
            renderBattleSlots();
            mpLockParty();
        }
        return true;
    }
    if (!s.me || !s.opp || !validParty(s.me.party) || !validParty(s.opp.party)) return false;

    if (s.phase === 'loading') {
        // 아직 첫 등장 전 — 파티가 정해졌으므로 배틀 시작부터 다시(남은 쪽은 로딩 완료 신호를 다시 보내 줌)
        battleParty = s.opp.party.map(p => ({ id: p.id, isShiny: !!p.isShiny }));
        beginBattle(mpSanitizeParty(s.me.party));
        return true;
    }
    return mpRestoreBattle(s, remain);
}

// 돌아온 쪽: 배틀 중간/결과 화면 복원(스냅샷의 me/opp는 보낸 쪽 기준이라 뒤집어서 씀)
function mpRestoreBattle(s, remain) {
    const mine = s.opp;
    const theirs = s.me;
    const idxOk = (side) => Number.isInteger(side.active) && side.active >= 0 && side.active < 3;
    if (!idxOk(mine) || !idxOk(theirs)) return false;

    battleMode = 'pvp';
    battleParty = mine.party.map((p, i) => ({
        id: p.id, isShiny: !!p.isShiny, hp: p.hp, fainted: !!p.fainted,
        shown: i === mine.active || !!p.fainted || p.hp < BATTLE_MON_MAX_HP
    }));
    aiParty = theirs.party.map(p => ({ id: p.id, isShiny: !!p.isShiny, hp: p.hp, fainted: !!p.fainted, known: !!p.known }));
    activePartyIndex = mine.active;
    activeAiIndex = theirs.active;
    playerRank = mine.rank || 0;
    aiRank = theirs.rank || 0;
    aiHealUses = 0;
    mpTurn = s.turn || 0;
    // 연속 시간 초과 횟수 이어받기 — 상대가 센 "내 패스"가 내 쪽 횟수, 상대 본인 패스가 상대 쪽 횟수
    selfPassStreak = s.missStreak || 0;
    mpMissStreak = s.selfPassStreak || 0;

    mpPartyLocked = false;
    mpAwaitingOpponentAction = false;
    mpMyLoadSent = true;
    battleAnimating = false;
    mpPendingTerminal = null;
    mpLoadingPhase = false;
    mpAwaitingForcedSwitch = false;
    mpPeerCommitTurn = -1;
    mpPendingResync = false;
    mpRematchWaiting = false;
    battleEnded = s.phase === 'result';
    battleTurnBusy = false;
    battleSwitchForced = false;
    pendingForcedSwitchCallback = null;
    battleResultRetryBtn.disabled = false;
    battleResultRetryBtn.textContent = '다시하기';
    clearBattleTimer();
    window.mpSetPresenceGrace(true);

    prepareBattleScreen();
    renderBattleActivesInstant();

    if (s.phase === 'result') {
        battleLastDidWin = (s.didWin === true || s.didWin === false) ? !s.didWin : null;
        battleTurnBusy = true;
        battleResultOverlayEl.classList.remove('hidden');
        // 다시하기를 눌러 둔 채 나갔다 왔으면 남은 쪽이 알려 준 남은 시간부터 다시 대기
        if (typeof s.yourRematchRemainingMs === 'number') mpStartRematchWait(Math.max(MP_RESUME_MIN_MS, s.yourRematchRemainingMs));
        return true;
    }

    if (s.sub === 'forcedMine') {
        // 상대가 교체할 포켓몬을 고르는 중 → 나는 기존처럼 "통신 대기 중..."
        battleTurnBusy = true;
        mpWaitForcedSwitch(() => finishTurn());
        return true;
    }
    if (s.sub === 'forcedYours') {
        // 내 포켓몬이 기절해 내가 고를 차례 → 교체 메뉴(남은 시간 이어서)
        battleTurnBusy = true;
        openForcedSwitch(() => finishTurn(), remain(BATTLE_FORCED_SWITCH_TIMEOUT_MS));
        return true;
    }

    const pending = mpLoadPendingSubmission();
    const actionMs = remain(BATTLE_ACTION_TIMEOUT_MS);
    if (pending && pending.turn === mpTurn) {
        // 새로고침 전에 이미 낸 행동 — 확정이므로 같은 값으로 교환을 다시 함
        battleTurnBusy = true;
        mpAwaitingOpponentAction = true;
        startMyActionDeadline(actionMs);
        mpSubmitTurnAction(pending.action, pending.nonce);
    } else if (s.peerCommitted) {
        // 상대는 내 행동(commit)을 이미 받았는데 복구할 수 없음 — 바꿀 수 없으므로 이번 턴은 패스
        battleTurnBusy = true;
        mpAwaitingOpponentAction = true;
        startMyActionDeadline(actionMs);
        mpSubmitTurnAction('pass');
    } else {
        showBattleMainMenuUI();
        startMyActionDeadline(actionMs);
    }
    return true;
}

// 등장 연출 없이 지금 나가 있는 양쪽 포켓몬·hp바·이름표를 바로 그림(기절해 있는 쪽은 모습만 숨김)
function renderBattleActivesInstant() {
    const foe = aiParty[activeAiIndex];
    foe.known = true;
    const monsterObj = partyEntryToMonsterObj(foe);
    stopShinyAnimation();
    shinyEffect.classList.add('hidden');
    const spriteEl = monster.querySelector('#monster-sprite');
    if (spriteEl) spriteEl.style.transition = '';
    monster.style.clipPath = '';
    monster.classList.remove('hidden');
    monsterInfo.classList.remove('hidden');
    monsterInfoText.classList.remove('hidden');
    monster.style.opacity = foe.fainted ? '0' : '';
    monsterInfo.style.opacity = '';
    monsterInfoText.style.opacity = '';
    displayMonsterSprite(monster, monsterObj.src, monsterObj.id, battleCallback(() => {
        alignWildMonsterTopToHpBar(monsterObj);
        if (monsterObj.isShiny && !foe.fainted) playShinyEffect();
    }));
    updateMonsterInfo(monsterObj);
    aiHpBar.reset(foe.hp);

    const me = battleParty[activePartyIndex];
    selectedBattleId = me.id;
    selectedBattleIsShiny = me.isShiny;
    battleBackSpriteEl.style.transition = '';
    battleBackSpriteBoxEl.style.clipPath = '';
    displayBackSprite(battleBackSpriteBoxEl, battleBackSpriteEl, me.id, me.isShiny);
    const info = POKEMON_DATA[me.id] || { name: '???' };
    battleBackNameEl.textContent = info.name;
    renderShortTypeIcons(battleBackTypesEl, info.types);
    playerHpBar.reset(me.hp);
    battleBackSpriteBoxEl.style.opacity = me.fainted ? '0' : '';
    battleBackInfoEl.style.opacity = '';
    battleBackInfoTextEl.style.opacity = '';
    updateBattleSwitchBtnState();
}

// 같은 계정이 다른 곳에서 이 대전으로 재접속해 이 페이지가 밀려남 — 문구 없이 시작화면으로
mpOnSuperseded = () => {
    clearBattleTimer();
    if (battlePreviewActive) { resetBattlePreview(); return; }
    if (dexPickerMode) {
        stopDexInfoSpriteAnimation();
        dexModal.classList.add('hidden');
        dexPickerMode = false;
        battleParty = [];
        mpPartyLocked = false;
        mpPickerEndText = null;
        dexBattleRandomBtn.classList.remove('hidden');
        battleSlotController.stopAll();
        startScreen.classList.remove('hidden');
    }
};

// ===================== 배틀 중 포켓몬 교체 =====================
// 자진 교체·강제 교체 모두 액션박스 안 이름 버튼 목록 하나를 씀 — 누르면 바로 교체 선택.
// 나가있거나 기절한 포켓몬은 목록에서 뺌
function renderBattleSwitchInlineMenu() {
    // 강제 교체(기절) 중엔 취소 불가라 뒤로가기(‹)를 숨김
    battleSwitchInlineBackBtn.classList.toggle('hidden', battleSwitchForced);

    battleSwitchInlineListEl.innerHTML = '';

    // 후보가 없을 수는 없음 — 자진 교체는 버튼이 비활성화되고, 강제 교체는 전멸이면 승패가 먼저 남
    const candidates = [];
    battleParty.forEach((entry, idx) => {
        if (!entry || idx === activePartyIndex || entry.fainted) return;
        candidates.push({ idx, entry });
    });

    candidates.forEach(({ idx, entry }) => {
        const info = POKEMON_DATA[entry.id] || { name: '???', types: [] };
        const btn = document.createElement('button');
        btn.className = 'menu-item battle-move-btn battle-switch-inline-btn';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'battle-switch-inline-name';
        // 이로치여도 포획 게임 화면(monsterNameEl)과 똑같이 이름만 표시 — "✨" 표시 안 함
        nameSpan.textContent = info.name;
        btn.appendChild(nameSpan);

        (info.types || []).forEach(t => {
            const icon = document.createElement('span');
            icon.className = 'battle-switch-inline-type-icon';
            const iconIdx = TYPE_ICON_INDEX[t] || 0;
            icon.style.backgroundPosition = `0 -${iconIdx * 16}px`;
            btn.appendChild(icon);
        });

        btn.addEventListener('click', () => {
            // 강제 교체는 턴 진행 중이라 즉시 적용 후 이어지던 턴을 계속함, 자진 교체는 이번 턴 행동으로 넘김
            if (battleSwitchForced) {
                battleSwitchForced = false;
                battleSwitchInlineMenuEl.classList.add('hidden');
                clearBattleTimer();
                if (isPvpBattle()) {
                    mpSend('forcedSwitch', { idx });
                    battleAnimating = true; // 이미 보낸 선택의 연출은 끝까지 재생
                }
                // 배틀 시작 등장과 같은 "가랏! ~!" 멘트 후 등장 — 상대 쪽은 같은 시점에 "상대가 ~을(를)
                // 내보냈다!" 멘트 후 등장하므로(switchAiToIndex) 함께하기에서 양쪽 타이밍이 맞음
                showBattleMessage(`가랏! ${info.name}!`, () => {
                    applyPlayerSwitch(idx, () => {
                        const cb = pendingForcedSwitchCallback;
                        pendingForcedSwitchCallback = null;
                        if (cb) cb();
                    });
                });
                return;
            }
            if (battleTurnBusy) return;
            startPlayerTurn({ switch: idx });
        });
        battleSwitchInlineListEl.appendChild(btn);
    });
}

battleSwitchBtn.addEventListener('click', () => {
    if (battleTurnBusy) return;
    renderBattleSwitchInlineMenu();
    battleMainMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.remove('hidden');
});

battleSwitchInlineBackBtn.addEventListener('click', () => {
    if (battleTurnBusy) return;
    showBattleMainMenuUI();
});

// ===================== 포켓몬 배틀 선택 (포켓몬 도감을 "선택 모드"로 재사용) =====================
// 도감(#dex-modal)을 dexPickerMode로 열고 슬롯 바와 "슬롯에 추가"만 덧붙임
let selectedBattleId = null;
let selectedBattleIsShiny = false;

// #dex-modal이 지금 "포켓몬 배틀"로 열려 선택 모드인지("포켓몬 도감"으로 열린 일반 브라우징과 구분)
let dexPickerMode = false;

// 배틀에 나갈 포켓몬(최대 3마리) — { id, isShiny, hp, fainted }(hp/fainted는 결정할 때 채움)
let battleParty = [];
const battleSlotEls = Array.from(dexBattleSlotRowEl.querySelectorAll('.battle-slot'));

// 지금 나가있는 포켓몬의 battleParty 인덱스
let activePartyIndex = 0;

// 배틀 화면이 열려 있는지 — 닫힌 뒤 늦게 실행되는 비동기 콜백이 #monster 위치를 건드리지 않게 막음
let battlePreviewActive = false;

// 배틀을 닫을 때마다 1씩 오름 — 예약한 때의 세션이 아니면 콜백을 버림
// (battlePreviewActive만으로는 새 배틀이 이미 열린 경우를 못 막음)
let battleSessionId = 0;
function battleCallback(fn) {
    const session = battleSessionId;
    return (...args) => {
        if (session === battleSessionId && fn) fn(...args);
    };
}

// 채워진 슬롯을 누르면 그 자리만 선택 해제
dexBattleSlotRowEl.addEventListener('click', (e) => {
    if (mpPartyLocked) return; // 함께하기에서 선택 완료 후(상대 대기 중)엔 파티 잠금
    const slotEl = e.target.closest('.battle-slot');
    if (!slotEl || slotEl.classList.contains('empty')) return;
    const idx = battleSlotEls.indexOf(slotEl);
    if (idx === -1 || !battleParty[idx]) return;

    battleParty.splice(idx, 1);
    renderBattleSlots();
});

// 선택 슬롯 3칸의 앞모습 애니메이션 컨트롤러 — 슬롯마다 토큰을 둬서 늦게 온 이미지가 엉뚱한 슬롯을 덮지 않게 함
function createSlotSpriteController(slotEls) {
    const animTimerIds = slotEls.map(() => null);
    const tokens = slotEls.map(() => 0);

    function stop(idx) {
        if (animTimerIds[idx] !== null) {
            clearInterval(animTimerIds[idx]);
            animTimerIds[idx] = null;
        }
    }

    function stopAll() {
        slotEls.forEach((_, idx) => stop(idx));
    }

    function clear(idx) {
        stop(idx);
        tokens[idx]++; // 이미 로딩 중이던 이전 이미지의 onload가 뒤늦게 와도 무시되게 함
        const slotEl = slotEls[idx];
        slotEl.classList.add('empty');
        const spriteEl = slotEl.querySelector('.battle-slot-sprite');
        spriteEl.style.backgroundImage = '';
        spriteEl.style.width = '';
        spriteEl.style.height = '';
        spriteEl.style.transform = '';
        slotEl.querySelector('.battle-slot-name').textContent = '';
        const typesEl = slotEl.querySelector('.battle-status-types');
        if (typesEl) typesEl.innerHTML = '';
        setBattleSlotFormIcon(slotEl, null);
    }

    function render(idx, id, isShiny) {
        stop(idx);
        const token = ++tokens[idx];
        const slotEl = slotEls[idx];
        const spriteBox = slotEl.querySelector('.battle-slot-sprite-box');
        const spriteEl = slotEl.querySelector('.battle-slot-sprite');

        const src = frontSpriteSrc(id, isShiny);

        spriteEl.style.backgroundRepeat = 'no-repeat';
        spriteEl.style.backgroundPosition = '0 0';
        spriteEl.style.backgroundImage = `url("${src}")`;

        const probe = new Image();
        probe.onload = () => {
            if (token !== tokens[idx]) return;

            const boxWidth = spriteBox.clientWidth || 60;
            const layout = computeFrontSpriteLayout(id, isShiny, probe.naturalWidth, probe.naturalHeight, boxWidth);
            applyFrontSpriteLayout(spriteEl, layout);
            animTimerIds[idx] = startFilmstrip(spriteEl, layout.displaySize, layout.frameCount);
        };
        probe.src = src;
    }

    return { render, stop, stopAll, clear };
}

const battleSlotController = createSlotSpriteController(battleSlotEls);

// battleParty 상태를 슬롯·결정하기 버튼·폼 그리드 체크 배지에 반영 — party를 바꾸는 곳은 마지막에 이것만 부름
function renderBattleSlots() {
    battleSlotEls.forEach((slotEl, idx) => {
        const entry = battleParty[idx];
        if (!entry) {
            battleSlotController.clear(idx);
            return;
        }
        slotEl.classList.remove('empty');
        const info = POKEMON_DATA[entry.id] || { name: '???' };
        // 이로치여도 포획 게임 화면(monsterNameEl)과 똑같이 이름만 표시 — "✨" 표시 안 함
        slotEl.querySelector('.battle-slot-name').textContent = info.name;
        // 이름 아래 타입 뱃지 — 상태 확인 화면(renderBattleStatusSlots)과 완전히 같은 디자인
        // (.battle-status-types, STATUS_TYPE_BADGE_HEIGHT)을 그대로 재사용
        renderTypeBadges(slotEl.querySelector('.battle-status-types'), info.types, STATUS_TYPE_BADGE_HEIGHT);
        setBattleSlotFormIcon(slotEl, info.category);
        battleSlotController.render(idx, entry.id, entry.isShiny);
    });

    // 3마리를 모두 골라야 활성화. 함께하기에서 선택 완료 후엔 "대기 중"(비활성), 상대가 나가면 끊김 안내
    dexBattleDecideBtn.textContent = mpPickerEndText ? mpPickerEndText
        : mpPartyLocked ? '대기 중' : '선택 완료';
    dexBattleDecideBtn.disabled = mpPartyLocked || battleParty.length < 3;
    dexBattleRandomBtn.disabled = mpPartyLocked;
    // 끊김 안내 문구가 길어 랜덤 선택과 한 줄에 안 들어가므로(버튼 줄 폭 초과) 그동안만 랜덤 선택을 숨김
    dexBattleRandomBtn.classList.toggle('hidden', !!mpPickerEndText);
    markDexFormGridPartyCells();
}

// 파티에 든 폼 칸에 체크 배지(.in-party) 표시 — 폼 칸 클릭이 곧 등록/해제라 유일한 시각적 표시
function markDexFormGridPartyCells() {
    dexInfoFormGridEl.querySelectorAll('.dex-form-cell').forEach(cell => {
        const { realId, isShiny } = parseDexCellId(cell.dataset.formId);
        const inParty = battleParty.some(p => p.id === realId && p.isShiny === isShiny);
        cell.classList.toggle('in-party', inParty);
    });
}

// 배틀 슬롯 바(#dex-battle-slot-row)+결정하기 버튼은 선택 모드(dexPickerMode)이고, 목록·정보
// 화면일 때만 보임 — 설정/도감 초기화/치트 코드 페이지에서는 숨겨서 그 화면들과 안 겹치게 함
function updateDexPickerBarVisibility() {
    const show = dexPickerMode
        && dexSettingsEl.classList.contains('hidden')
        && dexResetPageEl.classList.contains('hidden')
        && dexCheatPageEl.classList.contains('hidden');
    dexBattleSlotRowEl.classList.toggle('hidden', !show);
    dexBattleActionRowEl.classList.toggle('hidden', !show);

    // 선택 모드에서는 "잡음" 줄과 ⚙ 설정 버튼을 숨김 — 선택 도중 포획 상태가 바뀌면 슬롯과 어긋남
    dexBoxEl.classList.toggle('picker-mode', dexPickerMode);
    if (dexPickerMode) {
        dexCountBarEl.classList.add('hidden');
        dexSettingsBtn.classList.add('hidden');
    }
}

// "무작위" 버튼 — 잡은 적 있는 폼 중 3마리를 뽑아 파티를 통째로 새로 채움
dexBattleRandomBtn.addEventListener('click', () => {
    if (mpPartyLocked) return;
    const pool = [];
    Object.keys(POKEMON_DATA).forEach(id => {
        if (isFormColored(id)) pool.push({ id, isShiny: false });
        if (isFormShinyColored(id)) pool.push({ id, isShiny: true });
    });
    if (pool.length === 0) return;

    // Fisher-Yates로 섞은 뒤 최대 3개만 사용
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    battleParty = pool.slice(0, 3);
    renderBattleSlots();
});

dexBattleDecideBtn.addEventListener('click', () => {
    if (battleParty.length === 0) return;

    // 함께하기: 내 파티를 상대에게 보내고, 상대 파티가 올 때까지 "대기 중"(파티 잠금). 상대가
    // 먼저 골라뒀으면 mpWaitFor가 즉시 불려 곧바로 배틀로 넘어감
    if (mp.active) {
        if (mpPartyLocked || battleParty.length < 3) return;
        mpLockParty();
        return;
    }

    // AI 파티 구성은 아직 확정하지 않아서(추후 능력치가 생기면 종족치 기준으로 정하기로 함) 지금은
    // 야생 등장 로직을 재사용한 pickAiTeam()으로 채움
    beginBattle(pickAiTeam());
});

// 함께하기 파티 선택 완료 — 내 파티를 보내고 상대 파티를 기다림. 타이머는 선택 화면 진입 때부터 계속 흐름
function mpLockParty() {
    mpPartyLocked = true;
    renderBattleSlots();
    updateDexPickerBarVisibility();
    mpSend('party', battleParty.map(p => ({ id: p.id, isShiny: !!p.isShiny })));
    mpWaitFor('party', (oppParty) => {
        if (!mp.active || !mpPartyLocked) return;
        clearBattleTimer();
        beginBattle(mpSanitizeParty(oppParty));
    });
}

// 배틀 화면을 여는 공통 부분(선택창 닫기, 상대/내 쪽 hp바·이름표 배치, 메뉴 숨김) — 새 배틀 시작
// (beginBattle)과 재접속 복원(mpRestoreBattle)이 함께 씀
function prepareBattleScreen() {
    // 선택 모드 종료 — 슬롯 애니메이션만 정리하고 도감을 닫음(battleParty는 배틀이 끝날 때까지 유지)
    dexPickerMode = false;
    battleSlotController.stopAll();
    dexModal.classList.add('hidden');

    battlePreviewActive = true;
    startScreen.classList.add('hidden');

    // 메인 메뉴는 상대·내 포켓몬 등장 연출이 모두 끝난 뒤에 뜸
    battleResultOverlayEl.classList.add('hidden');
    battleMoveMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.add('hidden');
    battleMainMenuEl.classList.add('hidden');
    battleMessageBoxEl.classList.add('hidden');
    updateBattleSwitchBtnState();

    // 내 포켓몬 뒷모습은 아직 보여주지 않음(등장 연출은 아래 applyPlayerSwitch(0, ...)가 함) —
    // 다만 화면이 열리자마자 지난 배틀의 뒷모습이 잠깐 비쳐 보이지 않도록 미리 투명하게 해둠
    battleBackSpriteBoxEl.style.opacity = '0';
    battleBackInfoEl.style.opacity = '0';
    battleBackInfoTextEl.style.opacity = '0';

    // 상대(AI) 포켓몬은 화면 오른쪽으로 고정 이동(원본 게임처럼 고정 앵커, 계산 없음).
    // 포획 게임 쪽 기본(중앙) 위치는 이 클래스가 안 붙으므로 그대로 유지됨
    monster.classList.add('battle-side-right');

    // 상대 hp바+이름표를 화면 우측 상단(내 쪽과 비례하는 자리)에 고정 배치
    monsterInfoText.style.left = 'calc(50% + var(--battle-side-offset) + var(--battle-hp-width) / 2)';
    monsterInfoText.style.transform = 'translateX(-100%)';
    monsterInfoText.style.top = `${WILD_INFO_TOP - WILD_INFO_GAP - WILD_INFO_TEXT_ROW_CORRECTION}px`;
    monsterInfoText.style.bottom = 'auto';
    monsterInfo.style.left = 'calc(50% + var(--battle-side-offset))';
    monsterInfo.style.top = `${WILD_INFO_TOP - WILD_INFO_GAP + WILD_INFO_NAME_BLOCK_HEIGHT}px`;

    // hp바 디자인은 배틀 프리뷰에서만 overlay_hp_back/overlay_hp로 교체
    monsterInfo.classList.add('battle-hp-style');
    monsterInfoText.classList.add('battle-info-style'); // 이름 15px·줄높이 18px(내 쪽 이름표와 같게)
    monsterHpFillEl.classList.remove('hidden');

    battlePreviewScreen.classList.remove('hidden');
}

// 3v3 배틀 시작 — 내 파티/상대 파티 둘 다 hp를 채우고 기절 상태를 초기화함. opponentParty는 AI
// 배틀이면 pickAiTeam(), 함께하기면 상대가 보낸 파티({id, isShiny, hp, fainted, known})
function beginBattle(opponentParty) {
    battleMode = mp.active ? 'pvp' : 'ai';
    mpPartyLocked = false;
    mpTurn = 0;
    mpMissStreak = 0;
    selfPassStreak = 0;
    mpAwaitingOpponentAction = false;
    mpMyLoadSent = false;
    battleAnimating = false;
    mpPendingTerminal = null;
    mpLoadingPhase = isPvpBattle();
    mpAwaitingForcedSwitch = false;
    mpPeerCommitTurn = -1;
    battleLastDidWin = null;
    mpClearPendingSubmission();
    clearBattleTimer();
    // 배틀(결과 화면 포함) 중에는 상대 presence가 끊긴 채 유예를 넘기면 끊김 판정
    if (isPvpBattle()) window.mpSetPresenceGrace(true);
    battleParty.forEach(p => { p.hp = BATTLE_MON_MAX_HP; p.fainted = false; p.shown = false; });
    aiParty = opponentParty;
    activeAiIndex = 0;
    activePartyIndex = 0;
    battleEnded = false;
    battleTurnBusy = false;
    battleSwitchForced = false;
    pendingForcedSwitchCallback = null;
    playerRank = 0;
    aiRank = 0;
    aiHealUses = 0;

    selectedBattleId = battleParty[0].id;
    selectedBattleIsShiny = battleParty[0].isShiny;

    prepareBattleScreen();

    // 등장 연출 전에 이번 배틀 그림을 전부 받아 둠(제한시간은 혼자하기·함께하기 공통) —
    // 함께하기는 양쪽 다 받을 때까지 기다림
    showBattleWaiting('불러오는 중...');
    startBattleTimer(battleTurnTimerEl, BATTLE_LOADED_TIMEOUT_MS, () => {
        // 혼자하기: 불러오기 지연은 플레이어 탓이 아니므로 항복이 아니라 함께하기와 같은 승패 없는 종료
        if (!isPvpBattle()) {
            clearBattleTimer();
            if (battlePreviewActive && !battleEnded) showBattleTerminal({ reason: 'disconnect' });
            return;
        }
        // 신호를 이미 보내서(mpMyLoadSent) 상대 신호를 기다리는 중이면 여유를 더 준 뒤 판정하고,
        // 아직 내 그림을 다 못 받은 거면(네트워크가 너무 느림) 곧바로 끊김 처리
        if (mpMyLoadSent) { window.mpPeerSlackThenJudge(); return; }
        window.mpForceDisconnect();
    });
    preloadBattleAssets().then(battleCallback(() => {
        if (!isPvpBattle()) { clearBattleTimer(); playBattleIntro(); return; }
        mpMyLoadSent = true;
        mpSend('loaded');
        mpWaitFor('loaded', battleCallback(() => {
            clearBattleTimer();
            playBattleIntro();
        }));
    }));
}

// 상대 첫 포켓몬 등장 — 교체 연출(switchAiToIndex)을 그대로 씀
function playBattleIntro() {
    mpLoadingPhase = false;
    if (isPvpBattle()) battleAnimating = true;
    switchAiToIndex(0, () => {
        // 이어서 내 포켓몬 등장 — "가랏! ~!" 멘트 후 applyPlayerSwitch()로 뒷모습을 페이드인시킴
        // (applyPlayerSwitch가 뒷모습/이름/타입/hp바까지 전부 알아서 채워줌)
        const playerInfo = POKEMON_DATA[selectedBattleId] || { name: '???' };
        showBattleMessage(`가랏! ${playerInfo.name}!`, () => {
            applyPlayerSwitch(0, () => {
                if (reachSafePoint()) return;
                battleMessageBoxEl.classList.add('hidden');
                battleMessageBoxEl.textContent = '';
                battleMainMenuEl.classList.remove('hidden');
                startMyActionDeadline();
            });
        });
    });
}

// ===================== 상태 확인 오버레이 =====================
// 턴을 쓰지 않는 정보 화면 — 양쪽 파티와, 선택한 포켓몬 기준 순수 상성을 아이콘으로 보여줌
const battleStatusBtn      = document.getElementById('battle-status-btn');
const battleStatusModalEl  = document.getElementById('battle-status-modal');
const battleStatusCloseBtn = document.getElementById('battle-status-close-btn');
const battleStatusMySlotEls = Array.from(document.querySelectorAll('#battle-status-my-row .battle-slot'));
const battleStatusMyCellEls = Array.from(document.querySelectorAll('#battle-status-my-row .battle-status-cell'));
const battleStatusAiCellEls = Array.from(document.querySelectorAll('#battle-status-ai-row .battle-status-cell'));
const battleStatusAiSlotEls = battleStatusAiCellEls.map(cell => cell.querySelector('.battle-slot'));
const battleStatusMySlots = createSlotSpriteController(battleStatusMySlotEls);
const battleStatusAiSlots = createSlotSpriteController(battleStatusAiSlotEls);

// 상성 배율 → judgment.png 아이콘 클래스(굉장·매우 굉장=O, 별로·매우 별로=△, 효과 없음=X, 보통=없음)
function matchupIconClass(mult) {
    if (mult === 0) return 'none';
    if (mult > 1)   return 'good';
    if (mult < 1)   return 'bad';
    return '';
}

// 순수 상성 → 공격 버튼 아래 효과 미리보기 { icon, text } — 경계는 실제 데미지 멘트와 같음
function attackEffPreview(mult) {
    const icon = matchupIconClass(mult);
    if (mult === 0)   return { icon, text: '효과 없음' };
    if (mult >= 4)    return { icon, text: '효과가 매우 굉장함' };
    if (mult > 1)     return { icon, text: '효과가 굉장함' };
    if (mult <= 0.25) return { icon, text: '효과가 매우 별로' };
    if (mult < 1)     return { icon, text: '효과가 별로' };
    return { icon, text: '효과 있음' };
}

// 아직 전장에 나오지 않아 플레이어가 모르는 상대 포켓몬인지(내 파티 엔트리엔 known 필드가 없어 해당 없음)
const isStatusUnknown = (entry) => !!entry && entry.known === false;
const STATUS_UNKNOWN_SPRITE_SRC = 'images/pokemon/layout/random.png'; // 상태 확인 창 물음표 그림
const STATUS_TYPE_BADGE_HEIGHT = 13; // px, .battle-status-types .type-badge(style.css)와 반드시 일치

function renderBattleStatusSlots(slotEls, controller, party) {
    slotEls.forEach((slotEl, idx) => {
        const entry = party[idx];
        const typesEl = slotEl.querySelector('.battle-status-types');
        slotEl.classList.remove('fainted', 'unknown');
        typesEl.innerHTML = ''; // 빈 칸/모르는 상대는 타입을 보여주지 않음(정체가 드러나므로)
        if (!entry) { controller.clear(idx); return; }
        if (isStatusUnknown(entry)) {
            // 정체를 가리고 스프라이트 대신 물음표 정지 이미지만 보여줌(크기는 .unknown CSS가 지정)
            controller.clear(idx);
            slotEl.classList.remove('empty');
            slotEl.classList.add('unknown');
            slotEl.querySelector('.battle-slot-name').textContent = '???';
            slotEl.querySelector('.battle-slot-sprite').style.backgroundImage = `url("${STATUS_UNKNOWN_SPRITE_SRC}")`;
            return;
        }
        slotEl.classList.remove('empty');
        slotEl.querySelector('.battle-slot-name').textContent = (POKEMON_DATA[entry.id] || {}).name || '???';
        slotEl.classList.toggle('fainted', !!entry.fainted);
        renderTypeBadges(typesEl, (POKEMON_DATA[entry.id] || {}).types, STATUS_TYPE_BADGE_HEIGHT);
        // 정체가 드러난 포켓몬만 폼 아이콘 표시(아직 모르는 상대는 위에서 clear()로 숨겨짐)
        setBattleSlotFormIcon(slotEl, (POKEMON_DATA[entry.id] || {}).category);
        controller.render(idx, entry.id, entry.isShiny);
    });
}

function openBattleStatus() {
    if (battleTurnBusy || battleEnded) return;
    // 스프라이트 크기 계산이 슬롯 박스 실측 너비를 읽으므로 먼저 보이게 한 뒤 렌더함
    battleStatusModalEl.classList.remove('hidden');
    renderBattleStatusSlots(battleStatusMySlotEls, battleStatusMySlots, battleParty);
    renderBattleStatusSlots(battleStatusAiSlotEls, battleStatusAiSlots, aiParty);

    battleStatusSelected = { side: 'my', idx: activePartyIndex }; // 열 때는 지금 전장에 나가있는 내 포켓몬부터 시작
    updateBattleStatusMatchups();
}

// 빨간 칸(.active)은 양쪽 중 하나만 선택 — 선택한 포켓몬이 반대편 3마리를 공격할 때의 상성을 표시
let battleStatusSelected = { side: 'my', idx: 0 };
function updateBattleStatusMatchups() {
    const typesOf = (entry) => (entry && (POKEMON_DATA[entry.id] || {}).types) || [];
    const sides = {
        my: { slots: battleStatusMySlotEls, cells: battleStatusMyCellEls, party: battleParty },
        ai: { slots: battleStatusAiSlotEls, cells: battleStatusAiCellEls, party: aiParty }
    };
    const sel = battleStatusSelected;
    const selectedEntry = sides[sel.side].party[sel.idx];
    const otherSide = sel.side === 'my' ? 'ai' : 'my';

    Object.entries(sides).forEach(([side, s]) => {
        s.slots.forEach((slotEl, idx) => {
            slotEl.classList.toggle('active', side === sel.side && idx === sel.idx && !!s.party[idx]);
        });
        s.cells.forEach((cell, idx) => {
            const iconEl = cell.querySelector('.bs-icon');
            iconEl.className = 'bs-icon';
            const target = s.party[idx];
            // 모르는 상대는 아이콘으로도 타입이 드러나면 안 되므로 표시하지 않음
            if (side !== otherSide || !target || !selectedEntry || isStatusUnknown(target)) return;
            const cls = matchupIconClass(getBaseTypeMultiplier(typesOf(selectedEntry), typesOf(target)));
            if (cls) iconEl.classList.add(cls);
        });
    });
}

[['my', battleStatusMySlotEls, () => battleParty], ['ai', battleStatusAiSlotEls, () => aiParty]].forEach(([side, slotEls, getParty]) => {
    slotEls.forEach((slotEl, idx) => {
        slotEl.addEventListener('click', () => {
            const entry = getParty()[idx];
            if (!entry || isStatusUnknown(entry)) return; // 빈 칸/모르는 상대(선택하면 타입이 드러남)는 선택 불가
            battleStatusSelected = { side, idx };
            updateBattleStatusMatchups();
        });
    });
});

function closeBattleStatus() {
    battleStatusModalEl.classList.add('hidden');
    battleStatusMySlots.stopAll();
    battleStatusAiSlots.stopAll();
}

battleStatusBtn.addEventListener('click', openBattleStatus);
battleStatusCloseBtn.addEventListener('click', closeBattleStatus);

function resetBattlePreview() {
    closeBattleStatus();
    // 가장 먼저 꺼서, 이 시점 이후 뒤늦게 실행되는 비동기 콜백(autoSwitchAiNext,
    // alignWildMonsterTopToHpBar 등)이 전부 스스로 멈추게 함
    battlePreviewActive = false;
    battleSessionId++;
    cancelTypeMessage(battleMessageBoxEl);
    battleEnded = false;
    battleTurnBusy = false;
    battleSwitchForced = false;
    pendingForcedSwitchCallback = null;
    // 함께하기 재대결은 연결을 그대로 두고 메시지 채널만 새로 씀(다시하기 핸들러의 mpNextMatch)
    battleMode = 'ai';
    // 혼자하기 타이머 정리(함께하기는 연결 정리 mpTeardown/재대결 흐름이 따로 관리 — 재대결 대기 타이머를 지우면 안 됨)
    if (!mp.active) clearBattleTimer();
    window.mpClearSignalFreeze(); // 종료된 함께하기의 고정 신호 아이콘은 대결 화면을 떠나면 숨김
    mpTurn = 0;
    mpPartyLocked = false;
    mpRematchWaiting = false;
    battleAnimating = false;
    mpPendingTerminal = null;
    mpLoadingPhase = false;
    mpAwaitingForcedSwitch = false;
    mpPendingResync = false;
    mpPeerCommitTurn = -1;
    mpClearPendingSubmission();
    battleResultRetryBtn.disabled = false;
    battleResultRetryBtn.textContent = '다시하기';
    aiParty = [];
    activeAiIndex = 0;
    playerRank = 0;
    aiRank = 0;
    aiHealUses = 0;

    cancelAttackAnimations();
    stopBackSpriteAnimation();
    stopBackShinyAnimation();
    battleBackShinyEffectEl.classList.add('hidden');
    battleBackShinyEffectEl.style.top = '';
    battleBackShinyEffectEl.style.left = '';
    // displayBackSprite()가 실측 높이 기준으로 계산한 위치를 원래(CSS 기본값)로 복원
    battleBackSpriteBoxEl.style.top = '';
    // playPlayerFaintAnimation()/applyPlayerSwitch()가 남겼을 수 있는 opacity/transition/
    // 땅 라인(clip-path) 정리 — 페이드 도중 배틀을 닫아도 다음 배틀 시작 때 깨끗한 상태이도록
    battleBackSpriteEl.style.opacity = '';
    battleBackSpriteEl.style.transition = '';
    battleBackSpriteBoxEl.style.clipPath = '';
    battleBackSpriteBoxEl.style.opacity = '';
    battleBackInfoEl.style.opacity = '';
    battleBackInfoTextEl.style.opacity = '';
    battleBackHpFillEl.style.width = '';
    battleBackHpFillEl.style.backgroundPosition = '';

    // initGame()으로 보여준 상대(AI) 포켓몬(#monster 등)은 캐치 게임 전용 요소를 그대로 재사용한
    // 것이므로, 시작화면으로 돌아갈 때 반드시 다시 hidden 처리해야 뒤에서 비쳐 보이지 않음
    stopSpriteAnimation();
    stopShinyAnimation();
    monster.classList.add('hidden');
    // 기절 연출 도중 닫혔을 수 있으니 남은 transition과 땅 라인(clip-path)을 정리
    const monsterSpriteEl = monster.querySelector('#monster-sprite');
    if (monsterSpriteEl) monsterSpriteEl.style.transition = '';
    monster.style.clipPath = '';
    // alignWildMonsterTopToHpBar()가 인라인으로 덮어쓴 위치를 원래(CSS 기본값)로 복원
    monster.style.top = '';
    monsterInfo.classList.add('hidden');
    // 배틀 프리뷰 전용 hp바 디자인(overlay_hp_back/overlay_hp)을 원래(hp_bar.png)로 복원 —
    // 그대로 두면 다음에 실제 포획 게임을 시작할 때도 이 디자인이 남아있게 됨
    monsterInfo.classList.remove('battle-hp-style');
    monsterInfoText.classList.remove('battle-info-style');
    // hp가 깎이는 도중(애니메이션 진행 중)에 닫혔을 수도 있으니 타이머를 반드시 정리
    aiHpBar.cancel();
    playerHpBar.cancel();
    monsterHpFillEl.classList.add('hidden');
    monsterHpFillEl.style.width = '';
    monsterHpFillEl.style.backgroundPosition = '';
    monsterInfoText.classList.add('hidden');
    shinyEffect.classList.add('hidden');
    // playShinyEffect()가 매번 #monster의 현재 위치를 읽어 인라인으로 다시 계산하므로 다음 재생 전에
    // 항상 새로 덮어써지긴 하지만, 낡은 좌표가 남아있지 않도록 명시적으로 초기화
    shinyEffect.style.top = '';
    shinyEffect.style.left = '';
    // 대각선 배치용 좌우 고정 클래스/인라인 위치도 원상복구
    monster.classList.remove('battle-side-right');
    monsterInfo.style.left = '';
    monsterInfo.style.top = '';
    monsterInfoText.style.left = '';
    monsterInfoText.style.transform = '';
    monsterInfoText.style.top = '';
    monsterInfoText.style.bottom = '';

    // 액션박스를 기본 메뉴 상태로 복원
    battleMoveMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.add('hidden');
    battleMessageBoxEl.classList.add('hidden');
    battleMessageBoxEl.textContent = '';
    battleMainMenuEl.classList.remove('hidden');
    battleResultOverlayEl.classList.add('hidden');

    // 이번 배틀의 파티 정보도 비움(다음에 "포켓몬 배틀"을 다시 누르면 battleBtn 핸들러가 어차피
    // 새로 채우지만, 명시적으로 비워둬야 배틀이 끝난 뒤에도 옛 파티가 남아있는 상태가 되지 않음)
    battleParty = [];
    activePartyIndex = 0;

    battlePreviewScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// 함께하기 중 ×/처음으로 = 방을 나감(상대는 끊김 알림을 봄) — 다시하기만 연결을 유지함
// 배틀을 완전히 접고 시작화면으로 — ×(닫기)와 결과 화면 "처음으로"가 같이 씀
function leaveBattleToHome() {
    if (isPvpBattle() && mp.active) mpLeave();
    resetBattlePreview();
}
battlePreviewCloseBtn.addEventListener('click', leaveBattleToHome);
battleResultHomeBtn.addEventListener('click', leaveBattleToHome);
// 다시하기 — 곧바로 파티 선택 화면으로. 함께하기는 둘 다 누르면 이동(그 전엔 "대기 중")
battleResultRetryBtn.addEventListener('click', () => {
    if (isPvpBattle()) {
        if (!mp.active || mpRematchWaiting) return;
        mpStartRematchWait(MP_REMATCH_TIMEOUT_MS);
        return;
    }
    resetBattlePreview();
    openBattlePartyPicker();
});
// 함께하기 다시하기 대기 — 처음 누를 때와 재접속 후 복원할 때(mpOnSnapshot, 남은 시간) 같이 씀.
// 요청을 (새 채널로) 보내고 "대기 중"으로 바꾼 뒤, 상대도 다시하기를 누르면 둘 다 선택창으로
function mpStartRematchWait(durationMs) {
    mpRematchWaiting = true;
    battleResultRetryBtn.textContent = '대기 중';
    battleResultRetryBtn.disabled = true;
    mpSend('rematch');
    // 상대가 결과 화면에 머문 채 응답하지 않으면 무한히 기다리지 않고 방을 나감
    startBattleTimer(battleTurnTimerEl, durationMs, () => {
        if (!mpRematchWaiting) return;
        mpRematchWaiting = false;
        battleResultRetryBtn.textContent = '상대가 응답하지 않습니다';
        mpLeave();
        window.mpFreezeSignalIcon('lost'); // 상대 응답 없음 — 결과 화면을 나갈 때까지 끊김 아이콘
    });
    mpWaitFor('rematch', battleCallback(() => {
        clearBattleTimer();
        // 양쪽 다 동의 — 다음 대전용 새 메시지 채널로 옮긴 뒤 선택창으로
        window.mpNextMatch();
        resetBattlePreview();
        openBattlePartyPicker();
    }));
}

// 슬롯 선택 창에서 나중에 쓰는 작은 그림을 창이 열릴 때 미리 받아 둠(끊김 아이콘은 끊긴 순간엔 못 받을 수 있음)
const PICKER_PRELOAD_SRCS = [
    'images/pokemon/layout/types.png',
    'images/pokemon/pokedex/icon_mega.png',
    'images/pokemon/pokedex/icon_dynamax.png',
    'images/pokemon/layout/icon_signal.png',
    'images/pokemon/layout/icon_nosignal.png'
];
// 파티 선택 화면 열기 — "포켓몬 배틀" 버튼과 다시하기가 같이 씀
function openBattlePartyPicker(partyDeadlineMs = BATTLE_PARTY_TIMEOUT_MS) {
    PICKER_PRELOAD_SRCS.forEach(src => { loadImage(src); });
    dexPickerMode = true;
    battleParty = [];
    mpPartyLocked = false;
    mpPickerEndText = null;
    openDexModal(); // 검색창 초기화 + 목록 화면부터 시작 + 모달 표시
    renderBattleSlots(); // 슬롯 3칸을 빈 상태로 되돌리고 결정 버튼도 같이 초기화
    updateDexPickerBarVisibility();
    // 화면에 들어오는 이 순간부터 개인 제한시간 시작 — 도감을 보며 고르는 시간과 고른 뒤
    // 상대를 기다리는 시간을 하나로 이어서 셈(선택 완료를 눌러도 리셋되지 않음)
    if (mp.active) {
        // 파티 선택 단계는 presence 유예 대신 이 제한시간이 상한(로비에서 코드를 공유하느라 앱을
        // 오가는 경우가 많음)
        window.mpSetPresenceGrace(false);
        startBattleTimer(dexWaitTimerEl, partyDeadlineMs, () => {
            // 선택 완료를 이미 눌러서(mpPartyLocked) 상대 파티를 기다리는 중이면 여유를 더 준 뒤
            // 판정하고, 아직 고르지도 못한 거면(내 로컬 얘기) 곧바로 기권
            if (mpPartyLocked) { window.mpPeerSlackThenJudge(); return; }
            window.mpForfeit();
        });
    } else {
        // 혼자하기도 같은 제한시간 — 선택 완료를 누르면 곧바로 배틀이 시작되며(beginBattle) 타이머가 지워짐
        startBattleTimer(dexWaitTimerEl, partyDeadlineMs, battleTimeoutForfeit);
    }
}

// "포켓몬 배틀" → 혼자하기/함께하기 하위 메뉴(pokemon_multiplayer.js의 showStartSubmenu)
battleBtn.addEventListener('click', () => showStartSubmenu('mode'));

