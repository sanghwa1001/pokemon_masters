// ===================== script.js (공용 계층) =====================
// 포획·배틀 등 2개 이상 도메인에서 공통으로 쓰이는 함수/상수/DOM 참조만 모아둔 공용 계층.
// 로드 순서상 다른 모든 로직 파일보다 먼저 실행됨.

const monster     = document.getElementById('monster');
const shinyEffect = document.getElementById('shiny-effect');
const gameContainer = document.getElementById('game-container');
const controlPanel = document.getElementById('control-panel');
const monsterInfo = document.getElementById('monster-info');
const monsterInfoText = document.getElementById('monster-info-text'); // monster-info 밖의 별도 요소 — hp바와 표시/페이드 상태를 함께 맞춰야 함
const monsterNameEl = document.getElementById('monster-name');
const monsterBstEl  = document.getElementById('monster-bst');
const monsterTypesEl = document.getElementById('monster-types');
const monsterOwnedBadgeEl = document.getElementById('monster-owned-badge');
// ===================== 반응형 스케일링 =====================
// #game-container(370x600)를 렌더링된 #game-frame 너비 기준 배율로 스케일링(비율은 CSS aspect-ratio가 고정)
const BASE_WIDTH  = 370;
let currentScale = 1; // getThrowTargetBottom() 등 화면 좌표 기반 계산에서 로컬 좌표로 환산할 때 사용

const gameFrame = document.getElementById('game-frame');

// index.html의 인라인 스크립트가 같은 계산으로 첫 화면 배율을 먼저 적용함 — 계산을 바꾸면 그쪽도 같이 바꿀 것
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

// 일반 카테고리는 종 → 폼 2단계로 균등 선택 — 폼이 많은 종(로토무 등)이 더 자주 나오지 않게
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

// 이로치 등장 이펙트: 원본 GIF를 771x771 프레임으로 크롭해 이어붙인 필름스트립(31프레임)
const SHINY_EFFECT_SRC        = 'images/pokemon/layout/shiny.png';
const SHINY_FRAME_COUNT       = 31;
const SHINY_NATIVE_WIDTH      = 23901;
const SHINY_FRAME_INTERVAL_MS = 30; // 원본 gif의 실제 프레임(1~28번) 재생 속도와 동일하게 맞춤

// CP 합계를 천 단위 쉼표로 표시 (예: 1234 → "1,234")
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

// 앞모습 실측값(SPRITE_OFFSETS)에서 일반/이로치 값을 골라 같은 이름으로 돌려줌(없으면 null)
function getFrontSpriteMetrics(id, isShiny) {
    const o = typeof SPRITE_OFFSETS !== 'undefined' ? SPRITE_OFFSETS[id] : null;
    if (!o) return null;
    return isShiny
        ? { x: o.shinyX, y: o.shinyY, w: o.shinyW, h: o.shinyH, topSafety: o.shinyTopSafety, effectW: o.shinyEffectW, effectH: o.shinyEffectH }
        : { x: o.x, y: o.y, w: o.w, h: o.h, topSafety: o.topSafety, effectW: o.effectW, effectH: o.effectH };
}

// 이미지를 미리 받아 캐시에 올림 — 받으면 true, 오류(파일 없음 등)면 false, timeoutMs 안에 못 받으면 null
// (시간 초과여도 받기는 계속되고 진행은 막지 않음 — 호출하는 쪽이 "없는 그림"과 "느린 그림"을 구분할 수 있게)
const PRELOAD_TIMEOUT_MS = 1000;
function loadImage(src, timeoutMs = PRELOAD_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const img = new Image();
        const timer = setTimeout(() => resolve(null), timeoutMs);
        img.onload = () => { clearTimeout(timer); resolve(true); };
        img.onerror = () => { clearTimeout(timer); resolve(false); };
        img.src = src;
    });
}

// 초 단위 정수를 "mm:ss"로 표시
function formatMMSS(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ===================== 스프라이트시트 애니메이션 재생 =====================
// 가로 필름스트립 PNG를 background-position으로 옮겨 재생(canvas는 file://에서 tainted 오류라 배제).
// 가로가 세로의 2배를 넘으면 스프라이트시트로 보고 프레임 수 = round(가로/세로)
const SPRITE_FRAME_INTERVAL_MS = 90; // Pokemon Essentials 기본 프레임 딜레이(90ms)와 동일하게 맞춤

let spriteAnimTimerId = null;
function stopSpriteAnimation() {
    if (spriteAnimTimerId !== null) {
        clearInterval(spriteAnimTimerId);
        spriteAnimTimerId = null;
    }
}

// monster는 <div>라 background-image로 표시함.
// 퍼센트 기반 CSS steps()는 프레임이 겹쳐 보이는 버그가 있어 반드시 픽셀 단위 계산을 유지할 것
let currentSpriteSrc = null; // 비동기 로딩 도중 몬스터가 바뀌었는지 추적용 (style 문자열 비교보다 안전)
let currentMonsterFrameSize = 0;   // 현재 몬스터의 원본 프레임 크기(naturalHeight) — 샤이니 이펙트가 재사용
let currentMonsterDisplaySize = 0; // 현재 몬스터의 실제 표시 크기(SPRITE_SIZE_REF 보정 반영됨) — 샤이니 이펙트가 재사용

// 원본 프레임이 이 값보다 작으면 그만큼 작게 표시해 종족 간 몸집 차이를 반영(평균이 박스의 약 54%)
const SPRITE_REFERENCE_SIZE = 140;

// ===================== 정지 이미지 크기 보정 =====================
// 원본 캔버스 크기가 형제 폼과 안 맞는 폼(예: 자시안 89px vs 코스튬 192px)은 크기 계산에만 기본형 값을 씀.
// ⚠️ front/front_shiny의 정지 이미지 여부가 다를 수 있어 NORMAL/SHINY 명단을 분리 — 새 포켓몬은 폴더별로
// 진짜 정지 이미지일 때만 넣을 것(잘못 넣으면 조용히 틀린 보정이 들어감). 값은 기본형의 species ID
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

// 앞모습 표시 크기/위치 계산 — 포획 게임·배틀 상대·도감 정보·선택 슬롯이 함께 씀.
// 정지 이미지(frameCount 1)도 같은 계산을 해야 다른 포켓몬과 크기가 맞음
function computeFrontSpriteLayout(id, isShiny, naturalW, naturalH, boxWidth) {
    const frameSize  = naturalH;
    const frameCount = frameSize > 0 ? Math.max(1, Math.round(naturalW / frameSize)) : 1;

    // 보정 종은 크기 계산에만 기본형을 참조 — 캔버스 여백 비율이 폼마다 달라서
    // 기준값 = 기본형 그림높이 × (이 폼 캔버스 ÷ 이 폼 그림높이)
    const refSpeciesId = isShiny ? SPRITE_SIZE_REF_SPECIES_SHINY[id] : SPRITE_SIZE_REF_SPECIES_NORMAL[id];
    const refMetrics = refSpeciesId ? getFrontSpriteMetrics(refSpeciesId, isShiny) : null;
    const ownMetricsForSize = getFrontSpriteMetrics(id, isShiny) || { h: frameSize };
    const effectiveFrameSize = refMetrics ? refMetrics.h * frameSize / ownMetricsForSize.h : frameSize;

    // 박스 너비 = SPRITE_REFERENCE_SIZE px 비율로 확대하고, 그보다 큰 개체는 박스 너비에서 클램프
    const scale = boxWidth / SPRITE_REFERENCE_SIZE;
    const displaySize = Math.min(effectiveFrameSize * scale, boxWidth);

    // x/y 보정값은 원본 픽셀 기준이라 displaySize/frameSize 비율을 곱해야 함(boxWidth/140 금지).
    // 위치는 항상 자기 값이고, 일반/이로치 그림 구조가 다른 종이 있어 x/y와 shinyX/shinyY를 구분
    const off = getFrontSpriteMetrics(id, isShiny) || { x: 0, y: 0 };
    const pixelScale = displaySize / frameSize;
    const dx = off.x * pixelScale;
    const dy = off.y * pixelScale;

    return { frameSize, frameCount, displaySize, dx, dy };
}

// 레이아웃을 안쪽 레이어에 적용 — 레이어 크기를 프레임 한 칸과 같게 맞춰 프레임이 겹쳐 보이지 않게 함
function applyFrontSpriteLayout(spriteEl, layout) {
    const { displaySize, frameCount, dx, dy } = layout;
    spriteEl.style.width  = `${displaySize}px`;
    spriteEl.style.height = `${displaySize}px`;
    spriteEl.style.backgroundSize = `${displaySize * frameCount}px ${displaySize}px`;
    spriteEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

// 필름스트립 재생(앞모습/뒷모습 공통) — 돌려주는 interval id(정지 이미지면 null)로 호출한 쪽이 멈춤
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
const TYPE_BADGE_SMALL_HEIGHT = 13; // px, 상태 확인 창·선택창 슬롯·도감 폼 칸의 작은 뱃지(.battle-status-types .type-badge, .dex-form-types .type-badge)와 반드시 일치

// 컨테이너를 types 개수만큼의 .type-badge로 채움. badgeHeight: CSS에서 다른 높이를 쓰는 곳이 넘겨줌
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

// 대결 화면 이름표 전용 — 긴 뱃지(types.png) 대신 짧은 타입 아이콘(types_short.png, 정사각형)을 이름 옆에
// 붙임(긴 이름 + 두 타입이어도 타이머·신호 아이콘과 겹치지 않게). 크기는 .type-icon-short(CSS)와 반드시 일치
const TYPE_ICON_SHORT_SIZE = 18;
function renderShortTypeIcons(container, types) {
    container.innerHTML = '';
    (types || []).forEach(t => {
        const icon = document.createElement('span');
        icon.className = 'type-icon-short';
        icon.style.backgroundPosition = `0 -${(TYPE_ICON_INDEX[t] || 0) * TYPE_ICON_SHORT_SIZE}px`;
        container.appendChild(icon);
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
    // 배틀 화면에서는 CP 대신 타입 뱃지 — 포획 게임은 다음에 이 함수가 불릴 때 CP로 돌아옴
    if (battlePreviewActive) {
        monsterBstEl.classList.add('hidden');
        monsterTypesEl.classList.remove('hidden');
        renderShortTypeIcons(monsterTypesEl, (POKEMON_DATA[picked.id] || {}).types);
    } else {
        monsterTypesEl.classList.add('hidden');
        monsterBstEl.classList.remove('hidden');
        monsterBstEl.textContent = `CP ${formatCpTotal(picked.effectiveBst)}`;
    }
    // 이 폼+이로치를 잡은 적 있으면 이름 앞에 포획 완료 아이콘(치트 반영). 배틀 화면에선 숨김
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
// 선택 슬롯·상태 확인 슬롯·도감 폼 칸의 좌측 상단 폼 아이콘 — 보여 줄 상황이 아니면 category에 null
function setBattleSlotFormIcon(slotEl, category) {
    const iconEl = slotEl.querySelector('.battle-slot-form-icon');
    if (!iconEl) return;
    const show = category === 'mega' || category === 'gmax';
    iconEl.classList.toggle('mega', category === 'mega');
    iconEl.classList.toggle('gmax', category === 'gmax');
    iconEl.classList.toggle('hidden', !show);
}

// ===================== 프레임 이펙트 공통 로직 =====================
// 이로치·칼춤·HP회복 이펙트 공통 — 모두 "프레임 한 변 = 모든 프레임 최대 범위의 긴 변, 중심 = 그 범위의 중심"으로 만듦
const SHINY_EFFECT = { src: SHINY_EFFECT_SRC, frameCount: SHINY_FRAME_COUNT };

// 이펙트 크기 = 포켓몬 그림의 모든 프레임 평균 가로·세로의 평균 × 표시 배율(세로만 보면 납작한 포켓몬에서 작아 보임)
function getEffectSize(w, h, pixelScale) {
    return ((w + h) / 2) * pixelScale;
}

// el을 boxEl 정중앙에 size 크기로 놓고 한 번 재생한 뒤 숨기고 onFinish 호출.
// effect.offsetY: 중심을 포켓몬 키의 그 비율만큼 세로 이동(-0.5 = 머리 끝). SPRITE_OFFSETS x/y는 이미
// 상쇄되어 있어 적용하지 않음
function playFrameEffect(el, boxEl, size, bodyHeight, effect, onFinish) {
    // boxEl의 지금 렌더링 위치를 매번 읽음. 가로는 translateX(-50%)라 offsetLeft가 이미 중심(절반 폭을 더하지 말 것),
    // 세로는 offsetTop이 윗변이라 +offsetHeight/2
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

// 이로치 등장 이펙트(야생·배틀 상대) — 이로치 평균 크기 × 이 몬스터의 표시 배율
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


// 같은 요소에 새 메시지를 시작하거나 cancelTypeMessage()를 부르면 이전 타이핑은 멈춤(onDone 없음)
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
