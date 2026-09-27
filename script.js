// ===================== script.js (공용 계층) =====================
// 포획·배틀 등 2개 이상 도메인에서 공통으로 쓰이는 함수/상수/DOM 참조만 모아둔 공용 계층
// (근거는 MODULARIZATION_PLAN.md 참고). 로드 순서상 다른 모든 로직 파일보다 먼저 실행됨.

const monster     = document.getElementById('monster');
const shinyEffect = document.getElementById('shiny-effect');
const gameContainer = document.getElementById('game-container');
const controlPanel = document.getElementById('control-panel');
const monsterInfo = document.getElementById('monster-info');
const monsterInfoText = document.getElementById('monster-info-text'); // 이름표시패치: monster-info 밖으로 분리됨, hp바와 표시/페이드 상태를 계속 함께 맞춰줘야 함
const monsterNameEl = document.getElementById('monster-name');
const monsterBstEl  = document.getElementById('monster-bst');
const monsterTypesEl = document.getElementById('monster-types');
const monsterOwnedBadgeEl = document.getElementById('monster-owned-badge');
// ===================== 반응형 스케일링 =====================
// #game-container(고정 370x600)를 화면 크기에 맞게 스케일링. 비율은 #game-frame의 CSS
// aspect-ratio가 고정하므로, JS는 렌더링된 #game-frame 너비만 읽어 370px 기준 배율로 환산함
// (innerWidth 등 뷰포트 직접 계산 없이 항상 정확).
const BASE_WIDTH  = 370;
let currentScale = 1; // getThrowTargetBottom() 등 화면 좌표 기반 계산에서 로컬 좌표로 환산할 때 사용

const gameFrame = document.getElementById('game-frame');

function applyResponsiveScale() {
    if (!gameFrame) return;
    const scale = gameFrame.clientWidth / BASE_WIDTH;
    currentScale = scale;
    gameContainer.style.transform = `scale(${scale})`;
}

// #game-frame의 실제 렌더링 크기가 바뀔 때마다 반응 (창 리사이즈, 화면 회전,
// 페이지 활성화로 display:none → flex 전환되는 순간까지 전부 포함)
let scaleRafId = null;
const resizeObserver = new ResizeObserver(() => {
    if (scaleRafId !== null) cancelAnimationFrame(scaleRafId);
    scaleRafId = requestAnimationFrame(() => {
        applyResponsiveScale();
        scaleRafId = null;
    });
});
if (gameFrame) resizeObserver.observe(gameFrame);

// 최초 로드 시 1회 적용 (독립 실행 페이지라 #game-frame이 항상 보이는 상태이므로 이 한 번으로 충분함)
applyResponsiveScale();



// ===================== 9세대 확장: 카테고리 기반 등장/포획 시스템 =====================
// POKEMON_DATA의 각 항목은 category("normal"/"mega"/"gmax")와 species(폼 그룹핑용 기본 번호)를 가짐.

// 카테고리별 ID 목록으로 분리
const NORMAL_IDS = Object.keys(POKEMON_DATA).filter(id => POKEMON_DATA[id].category === 'normal');
const MEGA_IDS    = Object.keys(POKEMON_DATA).filter(id => POKEMON_DATA[id].category === 'mega');
const GMAX_IDS     = Object.keys(POKEMON_DATA).filter(id => POKEMON_DATA[id].category === 'gmax');

// 일반(normal) 카테고리는 "종(species) 먼저 균등 선택 → 그 종의 폼 중 균등 선택"하는
// 2단계 구조로 그룹화. 로토무(폼 6개)처럼 폼이 많은 종이 그만큼 더 자주 등장하는
// 쏠림을 막기 위함 — 폼 개수와 무관하게 모든 "종"이 동일한 확률로 뽑히게 됨.
const NORMAL_BY_SPECIES = {};
NORMAL_IDS.forEach(id => {
    const sp = POKEMON_DATA[id].species;
    (NORMAL_BY_SPECIES[sp] = NORMAL_BY_SPECIES[sp] || []).push(id);
});
const NORMAL_SPECIES_LIST = Object.keys(NORMAL_BY_SPECIES);

// 종(species) 번호 오름차순으로 정렬된 도감 순서. 메가/거다이맥스는 실제 도감처럼
// 별도 항목으로 세지 않고, 포획 시 해당 species(기본형)을 도감에 등록하는 방식으로 흡수됨.
const DEX_SPECIES_ORDER = NORMAL_SPECIES_LIST.slice().sort((a, b) => Number(a) - Number(b));

// 각 species의 "대표 개체" id — 도감 목록에 보여줄 이름/아이콘 기준(항상 기본형). 폼 그룹 안에
// species와 정확히 같은 id가 있으면 그걸 쓰고, 없는 극소수 케이스만 첫 폼으로 대체함.

// 샤이니 등장 이펙트: GIF 대신 몬스터와 동일한 PNG 필름스트립 + JS 프레임 제어 방식.
// 원본 0.gif(798x771, 31프레임)을 프레임마다 771x771로 중앙 크롭해 이어붙여 제작함
// → 23901x771, 31프레임, 프레임당 정확히 771px.
const SHINY_EFFECT_SRC        = 'images/pokemon/layout/shiny.png';
const SHINY_FRAME_COUNT       = 31;
const SHINY_NATIVE_WIDTH      = 23901;
const SHINY_FRAME_INTERVAL_MS = 30; // 원본 gif의 실제 프레임(1~28번) 재생 속도와 동일하게 맞춤

function formatCpTotal(cp) {
    return Math.round(cp).toLocaleString('ko-KR');
}

const CATEGORY_FOLDER = {
    normal: { base: 'front',      shiny: 'front_shiny' },
    mega:   { base: 'front_mega', shiny: 'front_mega_shiny' },
    gmax:   { base: 'front_gmax', shiny: 'front_gmax_shiny' },
};
const SPRITE9_ROOT = 'images/pokemon/pokemon';

// 앞모습 스프라이트 경로 — 그 폼의 카테고리(normal/mega/gmax)와 이로치 여부로 폴더를 골라 조합함.
// 포획 게임·도감·배틀이 모두 이 함수 하나로 경로를 만듦(아이콘 경로는 capturedIconSrc 참고)
function frontSpriteSrc(id, isShiny) {
    const category = (POKEMON_DATA[id] && POKEMON_DATA[id].category) || 'normal';
    const folders = CATEGORY_FOLDER[category] || CATEGORY_FOLDER.normal;
    return `${SPRITE9_ROOT}/${isShiny ? folders.shiny : folders.base}/${id}.png`;
}

// 앞모습 실측 데이터(SPRITE_OFFSETS, pokemon_front_sprite_offsets_data.js)에서 일반/이로치 값을 골라
// 같은 이름으로 돌려줌 — 호출하는 쪽마다 "isShiny ? off.shinyH : off.h" 같은 분기를 반복하지 않게 함.
// 그 폼의 데이터가 없으면 null(호출하는 쪽이 원래 쓰던 기본값으로 대체)
function getFrontSpriteMetrics(id, isShiny) {
    const o = typeof SPRITE_OFFSETS !== 'undefined' ? SPRITE_OFFSETS[id] : null;
    if (!o) return null;
    return isShiny
        ? { x: o.shinyX, y: o.shinyY, w: o.shinyW, h: o.shinyH, topSafety: o.shinyTopSafety, effectW: o.shinyEffectW, effectH: o.shinyEffectH }
        : { x: o.x, y: o.y, w: o.w, h: o.h, topSafety: o.topSafety, effectW: o.effectW, effectH: o.effectH };
}

// 도감/포획 목록에 쓰이는 아이콘 경로 (카테고리별로 icon/icon_mega/icon_gmax + _shiny 폴더로 분기)
const PRELOAD_TIMEOUT_MS = 1000;
function preloadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // 로딩 실패해도 게임 진행 자체는 막지 않음
        img.src = src;
        setTimeout(resolve, PRELOAD_TIMEOUT_MS);
    });
}

// ===================== 9세대 확장: 스프라이트시트 애니메이션 재생 =====================
// 프레임이 가로로 이어붙은 필름스트립 PNG라 GIF처럼 <img src>만으로 재생이 안 됨 —
// background-position을 JS 타이머(setInterval)로 옮겨가며 재생함(canvas는 file://에서 tainted
// canvas 오류가 나서 배제). 판별 기준: 가로가 세로의 2배 넘으면 스프라이트시트로 보고
// 프레임 수 = round(가로/세로).
const SPRITE_FRAME_INTERVAL_MS = 90; // Pokemon Essentials 기본 프레임 딜레이(90ms)와 동일하게 맞춤

let spriteAnimTimerId = null;
function stopSpriteAnimation() {
    if (spriteAnimTimerId !== null) {
        clearInterval(spriteAnimTimerId);
        spriteAnimTimerId = null;
    }
}

// monster는 <div>라서 background-image로 표시함(index.html/style.css 참고). 9세대 스프라이트시트면
// background-position을 픽셀 단위 JS 타이머로 옮겨 재생하고, 프레임이 1장이면 정적 이미지로 표시함.
// 주의: 퍼센트 기반 CSS steps() 애니메이션은 프레임이 박스보다 작게 그려져 여러 마리가 겹쳐
// 보이는 버그가 있었으므로 다시 쓰지 말 것 — 반드시 픽셀 단위 직접 계산 방식을 유지.
let currentSpriteSrc = null; // 비동기 로딩 도중 몬스터가 바뀌었는지 추적용 (style 문자열 비교보다 안전)
let currentMonsterFrameSize = 0;   // 현재 몬스터의 원본 프레임 크기(naturalHeight) — 샤이니 이펙트가 재사용
let currentMonsterDisplaySize = 0; // 현재 몬스터의 실제 표시 크기(SPRITE_SIZE_REF 보정 반영됨) — 샤이니 이펙트가 재사용

// 이 값보다 원본 프레임(정사각형 한 변, px)이 작은 포켓몬은 박스 안에서 그만큼 작게 표시되고,
// 크거나 같으면 박스를 꽉 채움 — 종족 간 몸집 차이가 화면에 반영되도록 함(668종 실측 기준,
// 평균이 박스의 약 54%를 채우도록 잡은 값).
const SPRITE_REFERENCE_SIZE = 140;

// ============================================================================
// 정지 이미지(코스튬/미등록폼/shadow폼) 크기 보정
// ============================================================================
// 문제: 일부 포켓몬은 원본 캔버스 크기가 형제 폼(기본형)과 안 맞음(예: 자시안 89px vs 코스튬
// 192px). 리사이즈 시 화질 손실이 생기므로 파일은 그대로 두고 "크기 계산에만" 기본형 값을 참조함.
//
// ⚠️ 명단 수정/추가 시 반드시 지킬 것 ⚠️ front/front_shiny는 "정지 이미지 여부"가 서로 다를 수
// 있어(실제 9종 확인됨) NORMAL/SHINY 명단을 반드시 분리 관리함 — 새 포켓몬 추가 시 front와
// front_shiny를 각각 확인해 "그 폴더가 진짜 정지 이미지일 때만" 해당 명단에 넣을 것. 문제없는
// 폴더까지 명단에 같이 넣으면 잘못된 보정이 조용히 섞여 들어가는 버그가 됨.
//
// 값은 기본형의 species ID이며, 실제 크기(h/shinyH)는 렌더링 시점에 SPRITE_OFFSETS에서 가져옴 —
// 위치는 항상 자기 자신 값을 쓰고 크기만 기본형을 참조하는 원칙을 다른 포켓몬과 동일하게 적용.
const SPRITE_SIZE_REF_SPECIES_NORMAL = {
    '716': '716',           // 형제 폼과 이미 크기가 같아 값은 안 바뀌지만, 일관성을 위해 포함
    '791-1': '791',
    '792-1': '792',
    '802-1': '802',
};
const SPRITE_SIZE_REF_SPECIES_SHINY = {
    '716': '716',
    '25-1': '25',            // front_shiny만 정지 이미지, front는 정상 애니메이션 → NORMAL 명단엔 없음
    '25-2': '25',
    '25-3': '25',
    '25-4': '25',
    '25-5': '25',
    '25-6': '25',
    '791-1': '791',
    '792-1': '792',
    '802-1': '802',
};

// 앞모습 필름스트립의 표시 크기/위치 계산 — displayMonsterSprite(포획 게임·배틀 상대),
// renderDexInfoSprite(도감 정보), createSlotSpriteController(배틀 선택·상태 슬롯)가 함께 씀.
// naturalW/naturalH: 불러온 PNG 원본 크기, boxWidth: 그림을 담는 바깥 박스의 실제 픽셀 너비.
// frameCount가 1이어도(정적 이미지, 예: 716번) 크기 계산은 동일하게 적용해야 다른 포켓몬들과
// 상대적 크기가 맞음 — 프레임 반복 재생만 건너뜀(startFilmstrip 참고)
function computeFrontSpriteLayout(id, isShiny, naturalW, naturalH, boxWidth) {
    const frameSize  = naturalH;
    const frameCount = frameSize > 0 ? Math.max(1, Math.round(naturalW / frameSize)) : 1;

    // 정지 이미지 보정 종(SPRITE_SIZE_REF_SPECIES_NORMAL/_SHINY)은 크기 계산에만 기본형을
    // 참조함(프레임 자르기는 원본 frameSize 그대로). 기본형 그림높이만 그대로 쓰면 안 되는
    // 이유는 캔버스 안 여백 비율이 폼마다 다르기 때문(예: 자시안 기본형 85% vs 코스튬 76%) —
    // 그래서 기준값 = 기본형 그림높이 × (이 폼 원본 캔버스 ÷ 이 폼 그림높이)로 보정함.
    // 일반/이로치는 독립된 파일이라 명단과 참조 h/shinyH도 각각 분리해서 씀.
    const refSpeciesId = isShiny ? SPRITE_SIZE_REF_SPECIES_SHINY[id] : SPRITE_SIZE_REF_SPECIES_NORMAL[id];
    const refMetrics = refSpeciesId ? getFrontSpriteMetrics(refSpeciesId, isShiny) : null;
    const ownMetricsForSize = getFrontSpriteMetrics(id, isShiny) || { h: frameSize };
    const effectiveFrameSize = refMetrics ? refMetrics.h * frameSize / ownMetricsForSize.h : frameSize;

    // 종족 간 상대적 크기가 보존되도록, "박스 너비 = SPRITE_REFERENCE_SIZE px"로 놓고
    // 그 비율만큼만 원본 프레임을 확대. SPRITE_REFERENCE_SIZE보다 큰 극소수 개체(전설급 등)는
    // 박스를 넘지 않도록 상한선(boxWidth)에서 클램프함.
    const scale = boxWidth / SPRITE_REFERENCE_SIZE;
    const displaySize = Math.min(effectiveFrameSize * scale, boxWidth);

    // SPRITE_OFFSETS의 x/y 보정값은 원본 픽셀 기준이라 축소 비율(displaySize/frameSize)을
    // 곱해서 적용해야 함 — SPRITE_SIZE_REF로 표시 크기만 줄인 경우 generic scale(boxWidth/140)을
    // 쓰면 보정값이 과하게 적용되므로 반드시 이 비율을 곱할 것.
    // 위치는 항상 "자기 자신"의 값을 쓰고(기본형 참조 아님), 일반/이로치 버전이 그림 구조 자체가
    // 다른 종(39종)이 있어서 일반은 x/y, 이로치는 shinyX/shinyY를 반드시 구분해서 사용함
    const off = getFrontSpriteMetrics(id, isShiny) || { x: 0, y: 0 };
    const pixelScale = displaySize / frameSize;
    const dx = off.x * pixelScale;
    const dy = off.y * pixelScale;

    return { frameSize, frameCount, displaySize, dx, dy };
}

// computeFrontSpriteLayout 결과를 안쪽 레이어에 적용 — 레이어 크기를 displaySize로 맞춰 "보여주는 창"과
// "프레임 한 칸 크기"를 항상 일치시킴(여러 프레임이 겹쳐 보이는 문제 방지). 레이어는 CSS로 박스
// 정중앙을 잡고, transform에서 SPRITE_OFFSETS 보정값만큼 픽셀 단위로 미세 이동시킴.
function applyFrontSpriteLayout(spriteEl, layout) {
    const { displaySize, frameCount, dx, dy } = layout;
    spriteEl.style.width  = `${displaySize}px`;
    spriteEl.style.height = `${displaySize}px`;
    spriteEl.style.backgroundSize = `${displaySize * frameCount}px ${displaySize}px`;
    spriteEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

// 필름스트립 재생 — 첫 프레임을 바로 그리고, 프레임이 2장 이상이면 SPRITE_FRAME_INTERVAL_MS마다
// frameWidth(표시 크기 기준 프레임 한 칸 폭)만큼 background-position을 옮김. 앞모습/뒷모습 공통.
// 돌려주는 interval id(정지 이미지면 null)는 호출하는 쪽이 자기 타이머 변수에 저장해 멈출 때 씀
function startFilmstrip(spriteEl, frameWidth, frameCount) {
    let frameIndex = 0;
    const drawFrame = () => {
        spriteEl.style.backgroundPosition = `-${frameIndex * frameWidth}px 0px`;
        frameIndex = (frameIndex + 1) % frameCount;
    };
    drawFrame();
    return frameCount > 1 ? setInterval(drawFrame, SPRITE_FRAME_INTERVAL_MS) : null;
}

function displayMonsterSprite(el, src, id, onReady) {
    stopSpriteAnimation();
    currentSpriteSrc = src;

    const sprite = el.querySelector('#monster-sprite') || el;
    sprite.style.backgroundRepeat = 'no-repeat';
    sprite.style.backgroundPosition = '0 0';
    sprite.style.backgroundSize = 'contain';
    sprite.style.backgroundImage = `url("${src}")`;
    sprite.style.width  = '100%';
    sprite.style.height = '100%';
    sprite.style.transform = 'translate(-50%, -50%)'; // 오프셋 정보 없으면 순수 중앙

    const probe = new Image();
    probe.onload = () => {
        if (currentSpriteSrc !== src) return; // 그 사이 다른 몬스터로 바뀌었으면 무시

        // src 경로에 "_shiny"가 있으면 이로치 버전 — 이 값 하나로 크기/위치 계산을 전부 분기함
        const isShinySrc = src.includes('_shiny');

        // 바깥 박스(el)의 실제 렌더링 픽셀 크기를 기준으로 계산(반응형 스케일과 무관하게 항상 정확)
        const boxWidth = el.clientWidth || parseFloat(getComputedStyle(el).width) || 288;
        const layout = computeFrontSpriteLayout(id, isShinySrc, probe.naturalWidth, probe.naturalHeight, boxWidth);

        // 샤이니 이펙트가 이 몬스터의 "원본 프레임 크기 대비 실제 표시 크기 비율"을 그대로
        // 재사용할 수 있도록 전역에 저장 (SPRITE_SIZE_REF로 크기가 보정된 종도 정확히 반영됨)
        currentMonsterFrameSize = layout.frameSize;
        currentMonsterDisplaySize = layout.displaySize;

        applyFrontSpriteLayout(sprite, layout);
        spriteAnimTimerId = startFilmstrip(sprite, layout.displaySize, layout.frameCount);
        if (onReady) onReady(); // 샤이니 이펙트 등, 크기 계산이 끝난 뒤에만 안전하게 실행돼야 하는 후속 작업용
    };
    probe.src = src;
}

const TYPE_ICON_ORDER = ["NORMAL", "FIGHTING", "FLYING", "POISON", "GROUND", "ROCK", "BUG", "GHOST",
    "STEEL", "QMARKS", "FIRE", "WATER", "GRASS", "ELECTRIC", "PSYCHIC", "ICE", "DRAGON", "DARK",
    "FAIRY", "STELLAR"];
const TYPE_ICON_INDEX = {};
TYPE_ICON_ORDER.forEach((t, i) => { TYPE_ICON_INDEX[t] = i; });
const TYPE_BADGE_HEIGHT = 21; // px, .type-badge와 반드시 일치

// 컨테이너를 types(예: ["FIRE","FLYING"]) 개수만큼의 .type-badge로 채움 — 배틀 프리뷰에서
// 이름 옆에 CP 대신 표시하는 타입 뱃지 한 줄 (#monster-types/#battle-back-types 양쪽에서 재사용)
// badgeHeight: 뱃지를 다른 크기로 쓰는 곳(상태 확인 창의 작은 뱃지 등)이 CSS에서 정한 높이를 넘겨줌
function renderTypeBadges(container, types, badgeHeight = TYPE_BADGE_HEIGHT) {
    container.innerHTML = '';
    (types || []).forEach(t => {
        const badge = document.createElement('span');
        badge.className = 'type-badge';
        const idx = TYPE_ICON_INDEX[t] || 0;
        badge.style.backgroundPosition = `0 -${idx * badgeHeight}px`;
        container.appendChild(badge);
    });
}

function updateMonsterInfo(picked) {
    currentBst = picked.bst;
    currentEffectiveBst = picked.effectiveBst;
    currentCategory = picked.category;
    currentMonsterName = picked.name;
    currentMonsterId = picked.id;
    currentIsShiny = picked.isShiny;
    // 배틀 프리뷰에서는 이름 옆에 콜론(:) 없이 이름만 보여줌(콜론은 뒤에 "CP 값"이 붙는 걸
    // 전제로 한 표기라, 지금은 타입 뱃지가 붙어서 안 맞음) — 포획 게임은 그대로 콜론 유지
    monsterNameEl.textContent = battlePreviewActive ? picked.name : `${picked.name}:`;
    // 배틀 프리뷰에서는 CP 대신 타입 뱃지를 보여줌 — 포획 게임(battlePreviewActive가 false)은
    // 그대로 CP를 보여줘야 하므로 이 플래그로만 분기함(공유 요소라 별도 클래스 토글 불필요 —
    // 다음 번 실제 포획 게임 시작 시 이 함수가 다시 불리면서 자동으로 CP 표시로 돌아옴)
    if (battlePreviewActive) {
        monsterBstEl.classList.add('hidden');
        monsterTypesEl.classList.remove('hidden');
        renderTypeBadges(monsterTypesEl, (POKEMON_DATA[picked.id] || {}).types);
    } else {
        monsterTypesEl.classList.add('hidden');
        monsterBstEl.classList.remove('hidden');
        monsterBstEl.textContent = `CP ${formatCpTotal(picked.effectiveBst)}`;
    }
    // 이 폼+이로치 여부까지 정확히 일치하게 예전에 잡은 적 있으면 이름 앞에 포획 완료 아이콘 표시
    // (도감 폼 그리드와 동일하게 isFormColored/isFormShinyColored 재사용, 치트 코드도 반영됨).
    // 배틀 프리뷰는 이미 잡은 포켓몬 중에서 고르는 화면이라 항상 표시될 것이므로 아이콘을 숨김.
    const alreadyOwnedExact = picked.isShiny ? isFormShinyColored(picked.id) : isFormColored(picked.id);
    monsterOwnedBadgeEl.classList.toggle('hidden', battlePreviewActive || !alreadyOwnedExact);
    monsterInfo.classList.remove('hidden');
    monsterInfoText.classList.remove('hidden');
}

// shiny 등장 이펙트 재생 타이머(연속으로 shiny가 나올 때 이전 재생을 안전하게 정리하기 위해 필요)
let shinyAnimTimerId = null;
function stopShinyAnimation() {
    if (shinyAnimTimerId !== null) {
        clearInterval(shinyAnimTimerId);
        shinyAnimTimerId = null;
    }
}

// ===================== 폼 아이콘(메가/다이맥스) 공통 로직 =====================
// 배틀 파티 선택 슬롯·상태 확인 화면 슬롯·포켓몬 도감 폼 칸의 좌측 상단 폼 아이콘(.battle-slot-form-icon)을
// 보이거나 숨기는 유일한 판단 로직 — 메가진화(mega)는 메가 아이콘, 거다이맥스(gmax)는 다이맥스 아이콘을
// 보이고 그 외는 숨김. 호출하는 쪽이 "보여 줄 상황이 아니면"(빈 칸, 정체를 모르는 상대, 못 잡은 폼)
// category에 null을 넘김. 아이콘 요소가 없는 칸은 그냥 넘어감
function setBattleSlotFormIcon(slotEl, category) {
    const iconEl = slotEl.querySelector('.battle-slot-form-icon');
    if (!iconEl) return;
    const show = category === 'mega' || category === 'gmax';
    iconEl.classList.toggle('mega', category === 'mega');
    iconEl.classList.toggle('gmax', category === 'gmax');
    iconEl.classList.toggle('hidden', !show);
}

// ===================== 프레임 이펙트 공통 로직 =====================
// 이로치 등장 이펙트와 배틀의 칼춤(랭크업)/HP회복(회복) 이펙트가 모두 이 규칙 하나를 씀.
// 이펙트 그림(필름스트립)은 전부 "프레임 한 변 = 모든 프레임을 합친 최대 범위의 긴 변, 프레임 중심 =
// 그 범위의 중심"이 되도록 만들어져 있어서, 프레임 크기만 같으면 세 이펙트가 같은 크기로 보임.
const SHINY_EFFECT = { src: SHINY_EFFECT_SRC, frameCount: SHINY_FRAME_COUNT };

// 이펙트 프레임 한 변 = 포켓몬 실제 그림(투명 제외)의 가로·세로 평균 × 표시 배율. 세로만 보면 좌우로
// 납작한 포켓몬은 이펙트가 포켓몬보다 작아 보임. w/h는 0번 프레임이 아니라 모든 프레임 평균값
// (오프셋 데이터의 effectW/effectH, 이로치는 shinyEffectW/shinyEffectH)을 넘김
function getEffectSize(w, h, pixelScale) {
    return ((w + h) / 2) * pixelScale;
}

// el(이펙트 요소)을 boxEl(포켓몬 박스) 정중앙에 size 크기로 놓고 effect 필름스트립을 한 번 재생함.
// effect.offsetY가 있으면 중심을 포켓몬 키(bodyHeight, 화면 px)의 그 비율만큼 세로로 옮김(음수 = 위).
// 예: -0.5면 이펙트 중심이 포켓몬 머리 끝에 옴(칼춤처럼 원작에서 포켓몬 중심이 아닌 곳에 그려지는 이펙트용).
// 끝나면 스스로 멈추고 el을 숨긴 뒤 onFinish 호출. 반환한 interval id는 호출한 쪽이 자기 타이머
// 변수에 보관해 중간에 멈출 때 씀.
// 위치: SPRITE_OFFSETS의 x/y는 적용하지 않음 — 그 값은 그림을 박스 정중앙으로 옮기는 보정값이라
// 포켓몬에는 이미 상쇄되어 있어서, 이펙트에도 또 적용하면 오히려 어긋남.
function playFrameEffect(el, boxEl, size, bodyHeight, effect, onFinish) {
    // boxEl의 "지금 실제로 렌더링된" 위치를 매번 다시 읽음(포획 게임 기본 위치든, 배틀에서 인라인으로
    // 재조정한 위치든 항상 정확히 겹치도록). 포켓몬 박스들은 left:X%+translateX(-50%)라 offsetLeft
    // 자체가 이미 가로 중심 — 여기에 +offsetWidth/2를 더하면 절반 폭만큼 밀려나므로 절대 더하지 말 것.
    // (Y축은 이동 transform이 없어 offsetTop이 진짜 윗변이라 +offsetHeight/2가 필요 — X축과 다름)
    el.style.top = `${boxEl.offsetTop + boxEl.offsetHeight / 2 + (effect.offsetY || 0) * bodyHeight}px`;
    el.style.left = `${boxEl.offsetLeft}px`;
    el.style.width  = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundImage = `url("${effect.src}")`;
    el.style.backgroundSize  = `${size * effect.frameCount}px ${size}px`;
    el.style.transform = 'translate(-50%, -50%)';

    let frameIndex = 0;
    const drawFrame = () => {
        el.style.backgroundPosition = `-${frameIndex * size}px 0px`;
    };
    drawFrame();
    el.classList.remove('hidden');

    const timerId = setInterval(() => {
        frameIndex++;
        if (frameIndex >= effect.frameCount) {
            clearInterval(timerId);
            el.classList.add('hidden');
            if (onFinish) onFinish();
            return;
        }
        drawFrame();
    }, SHINY_FRAME_INTERVAL_MS);
    return timerId;
}

// shiny 등장 이펙트(포획 게임 야생 포켓몬, 배틀 상대 포켓몬) — 크기는 이로치 그림의 모든 프레임 평균
// 가로·세로(shinyEffectW/shinyEffectH)에 이 몬스터의 원본→표시 배율(currentMonsterDisplaySize/currentMonsterFrameSize)을
// 곱해 계산 — SPRITE_SIZE_REF로 크기가 보정된 종도 이 배율에 이미 반영되어 있어 자동으로 맞음
function playShinyEffect() {
    stopShinyAnimation(); // 혹시 이전 재생이 아직 진행 중이면 정리 (연속 shiny 대비)

    const m = getFrontSpriteMetrics(currentMonsterId, true) || {};
    const frameSize = currentMonsterFrameSize || (SHINY_NATIVE_WIDTH / SHINY_FRAME_COUNT);
    const pixelScale = currentMonsterDisplaySize / frameSize;
    const h = m.effectH || m.h || frameSize;
    const size = getEffectSize(m.effectW || m.w || frameSize, h, pixelScale);

    shinyAnimTimerId = playFrameEffect(shinyEffect, monster, size, h * pixelScale, SHINY_EFFECT, () => {
        shinyAnimTimerId = null;
    });
}


// 포켓볼 상태를 던지기 전 초기 상태로 되돌림 (인라인 스타일/클래스/애니메이션 모두 제거)
// 같은 요소에 새 메시지를 시작하거나 cancelTypeMessage()를 부르면 이전 타이핑은 그 자리에서 멈춤
// (onDone도 안 부름) — 안 그러면 두 타이핑이 한 요소에 글자를 번갈아 붙여 문장이 뒤섞임
function typeMessage(el, text, charDelay, onDone) {
    const token = (el.typeMessageToken || 0) + 1;
    el.typeMessageToken = token;
    el.textContent = '';
    el.classList.remove('hidden');
    let i = 0;
    (function step() {
        if (el.typeMessageToken !== token) return;
        if (i < text.length) {
            el.textContent += text[i];
            i++;
            setTimeout(step, charDelay);
        } else if (onDone) {
            onDone();
        }
    })();
}

function cancelTypeMessage(el) {
    el.typeMessageToken = (el.typeMessageToken || 0) + 1;
}

// 포획 성공 처리 — 메시지를 한 글자씩 보여준 뒤 2초 대기, 몬스터 교체 및 버튼 재표시
