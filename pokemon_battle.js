// ===================== pokemon_battle.js (3v3 AI 트레이너 배틀) =====================
// pokemon_pokedex.js(openDexModal/dexPickerMode)와 pokemon_catch.js(initGame)를 그대로
// 가져다 쓰므로 가장 마지막에 로드되어야 함(구조는 MODULARIZATION_PLAN.md 참고).

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
// "포켓몬" 버튼을 눌렀을 때 액션박스 안에서 뜨는 교체 이름 버튼 목록(예전 별도 교체창을 대체)
const battleSwitchInlineMenuEl  = document.getElementById('battle-switch-inline-menu');
const battleSwitchInlineListEl  = document.getElementById('battle-switch-inline-list');
const battleSwitchInlineBackBtn = document.getElementById('battle-switch-inline-back-btn');
const battleMessageBoxEl    = document.getElementById('battle-message-box');
const battleBackInfoEl      = document.getElementById('battle-back-info');
const battleBackHpFillEl    = document.getElementById('battle-back-hp-fill');
const battleResultOverlayEl = document.getElementById('battle-result-overlay');
const battleResultTextEl    = document.getElementById('battle-result-text');
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

// 몬스터 등장 카테고리(일반 97% / 메가 2.5% / 거다이맥스 0.5%)를 먼저 정하고,
// 그 안에서 개체를 고름. 일반은 "종 먼저 균등 선택 → 폼 균등 선택"(쏠림 방지),
// 메가/거다이맥스는 해당 카테고리 안에서 그냥 균등 선택 (쏠림 영향이 미미해서 단순 처리)
let backSpriteAnimTimerId = null;
let currentBackSpriteToken = 0; // 재생 도중 다른 포켓몬으로 바뀌었는지 추적(비동기 로딩 대비)
// 현재 내 포켓몬(뒷모습)의 화면상 실제 그림 높이(px) — off.h * pixelScale, displayBackSprite()가
// 갱신함. 기절 연출(playPlayerFaintAnimation)이 상대(AI) 쪽과 동일한 방식으로 땅 라인/하강
// 거리를 계산하는 데 재사용함
let currentBackContentHeight = 0;
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

// 내 포켓몬(뒷모습)용 shiny 등장 이펙트 — playShinyEffect()(야생용)와 같은 공통 로직(playFrameEffect).
// boxEl: #battle-back-sprite-box(위치는 displayBackSprite()가 그림 기준으로 계산해둔 상태),
// size: currentBackEffectSize(그림의 모든 프레임 평균 가로·세로를 다시 평균낸 값 × 표시 배율)
function playBackShinyEffect(boxEl, size) {
    stopBackShinyAnimation();
    backShinyAnimTimerId = playFrameEffect(battleBackShinyEffectEl, boxEl, size, currentBackEffectBodyHeight, SHINY_EFFECT, () => {
        backShinyAnimTimerId = null;
    });
}

// 배틀 뒷모습도 앞모습(displayMonsterSprite)과 완전히 같은 방식으로 재생함 — 필름스트립을
// background-position으로 프레임 폭만큼씩 옮기며 재생하고, SPRITE_REFERENCE_SIZE 기준으로 상대
// 크기를 계산한 뒤 BACK_SPRITE_OFFSETS(x/y/w/h 실측값)로 그림 중심을 박스 정중앙에 맞춤.
// "그림 하단이 hp바/이름표에 닿기"는 안쪽 그림이 아니라 바깥 박스(boxEl) 위치를
// alignWildMonsterTopToHpBar()와 동일한 방식으로 역산해 처리함 — 그림이 박스 안 어디에 있어도
// 정확한 지점에서 닿음. boxEl: 바깥 박스(크기/위치 기준), spriteEl: 실제 그림을 표시하는 안쪽 레이어.
//
// BACK_SPRITE_SIZE_REF_SPECIES_NORMAL/_SHINY는 front의 SPRITE_SIZE_REF_SPECIES_NORMAL/_SHINY와
// 같은 목적 — 형제 폼은 애니메이션인데 이 폼만 정지 이미지라 원본 캔버스가 안 맞는 뒷모습 종을
// 등록함(값은 기준 형제 폼 id, 실측 h는 BACK_SPRITE_OFFSETS에서 가져옴). 일반/이로치는 독립
// 파일이라 한쪽만 정지 이미지인 경우가 있어(예: 25-1~25-6은 이로치만) 명단도 분리함. 이 명단은
// 스크립트로 전수 스캔해서 확정함: 종 기준형이 애니메이션인데 다른 폼이 정지 이미지인 경우만
// 골라내며, 단순 크기 비율 차이(메가진화 등)는 제외함.
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
            // w가 h의 정확한 배수일 때만 "정사각형 타일 시트"로 보고 프레임을 나눔 — 일부
            // 뒷모습(주로 back_mega 계열)은 프레임 1장에 정사각형도 아니라서(예: 112x51),
            // 배수가 아니면 이미지 전체를 직사각형 프레임 1장으로 취급함(build_back_offsets_xywh.py의
            // frame_w 판정과 반드시 동일해야 함 — 다르면 오프셋 실측값과 어긋나 그림이 잘리거나 밀림).
            const frameCount = (naturalH > 0 && naturalW % naturalH === 0) ? Math.max(1, naturalW / naturalH) : 1;
            const frameW = frameCount > 1 ? naturalH : naturalW;
            const frameH = naturalH;

            // BACK_SPRITE_OFFSETS의 x/y/w/h는 "원본 프레임 픽셀" 기준 실측값 — displayMonsterSprite()와
            // 동일한 계산에 쓰임(아래 dx/dy/artworkBottomY 참고)
            const off = (typeof BACK_SPRITE_OFFSETS !== 'undefined' &&
                         BACK_SPRITE_OFFSETS[info.folder] &&
                         BACK_SPRITE_OFFSETS[info.folder][info.fileId]) || { x: 0, y: 0, w: frameW, h: frameH };

            // 형제 폼은 애니메이션인데 이 폼만 정지 이미지라 원본 캔버스 크기가 안 맞는 종
            // (BACK_SPRITE_SIZE_REF_SPECIES_NORMAL/_SHINY)은 "크기 계산에만" 형제 폼(종 기준형)의
            // 실측 높이를 참조함 — 위치(dx/dy)/프레임 자르기(frameW/frameCount)는 항상 자기 자신
            // 값 그대로 씀(front의 effectiveFrameSize와 완전히 동일한 원칙)
            const refSpeciesId = isShiny ? BACK_SPRITE_SIZE_REF_SPECIES_SHINY[id] : BACK_SPRITE_SIZE_REF_SPECIES_NORMAL[id];
            const refOff = refSpeciesId && BACK_SPRITE_OFFSETS[info.folder] && BACK_SPRITE_OFFSETS[info.folder][refSpeciesId];
            const effectiveFrameH = (refOff && off.h) ? (refOff.h * frameH / off.h) : frameH;

            const boxWidth = boxEl.clientWidth || parseFloat(getComputedStyle(boxEl).width) || 160;
            const scale = boxWidth / SPRITE_REFERENCE_SIZE;
            // 세로(effectiveFrameH) 기준으로 배율을 정해 종족 간 상대 크기감을 유지하고(기존과 동일
            // 기준), 가로는 같은 배율을 그대로 적용해 원본 프레임의 가로세로 비율을 유지함(정사각형
            // 강제 안 함) — pixelScale은 항상 원본 frameH 기준이라 아래 dx/dy/artworkBottomY 계산은
            // effectiveFrameH 보정과 무관하게 그대로 정확함
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

            // 박스 위치: 그림의 실제 아래쪽 끝(off.h 실측값 기준)이 hp바+이름표 바로 위(이름표 상단,
            // battleBackInfoTextEl.offsetTop)에 정확히 닿도록 역산 — alignWildMonsterTopToHpBar()의
            // artworkTopY 계산과 완전히 대칭(위/아래만 반대)
            const boxHeight = boxEl.clientHeight || parseFloat(getComputedStyle(boxEl).height) || 0;
            const artworkBottomY = (boxHeight / 2) + ((off.h || frameH) * pixelScale) / 2;
            // 0번 프레임만 실측한 값으로 박스를 고정하면, 재생 중 다른 프레임(그림이 0번보다 아래로
            // 더 튀어나온 프레임)에서 정보블록과의 실제 간격이 BACK_INFO_GAP보다 좁아질 수 있음 —
            // bottomSafety(0번 프레임 하단여백 - 전체 프레임 중 최소 하단여백,
            // pokemon_back_sprite_offsets_data.js)만큼 박스를 정보블록 반대 방향(위)으로 더 밀어서,
            // 어떤 프레임이 나와도 간격이 항상 BACK_INFO_GAP 이상이 되도록 보장함
            const bottomSafety = off.bottomSafety || 0;
            // 이름표 상단이 "그림이 원래 닿는 지점"이지만, BACK_INFO_GAP만큼 위로 더 띄워서
            // 그림과 정보블록 사이 5px 간격을 유지함
            const targetY = battleBackInfoTextEl.offsetTop - BACK_INFO_GAP;
            boxEl.style.top = `${targetY - artworkBottomY - bottomSafety * pixelScale}px`;

            // 기절 연출에서 상대(AI) 쪽과 동일하게 재사용할 수 있도록, 이로치 여부와 상관없이 항상 저장
            currentBackContentHeight = (off.h || frameH) * pixelScale;
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

// 몬스터 이름 / 종족값 오버레이 갱신
// images/pokemon/layout/types.png(64x560, 세로로 20칸)의 순서 — 원본 게임(species.dat의
// GameData::Type#icon_position)에서 그대로 실측한 순서라 이미지와 정확히 일치함
const WILD_INFO_TOP = 15; // px, #game-container 상단 기준 — 이름표 상단 여백(내 쪽 액션박스-hp바 15px 여백과 대응)
const WILD_INFO_NAME_BLOCK_HEIGHT = 23; // px — 이름표 줄높이(20) + hp바와의 여백(3), 이름표 바로 아래에 hp바가 옴
const WILD_INFO_GAP = 5; // px — 정보블록(이름표+hp바)을 스프라이트에서 위로 띄우는 간격
// 이름표 줄의 실제 렌더링 높이는 타입 뱃지 이미지 높이(21px)를 따라가서 WILD_INFO_NAME_BLOCK_HEIGHT가
// 가정한 텍스트 줄높이(20px)보다 1px 큼 — 그래서 이름표-hp바 여백이 의도한 3px보다 좁게(2px) 보이던
// 것을 보정. hp바/스프라이트 위치(WILD_INFO_NAME_BLOCK_HEIGHT 기준 계산)는 이미 서로 잘 맞춰져
// 있으므로 건드리지 않고, 이름표 줄 자신의 위치만 이 값만큼 위로 올려서 맞춤
const WILD_INFO_TEXT_ROW_CORRECTION = 1;
function alignWildMonsterTopToHpBar(picked) {
    // 이 콜백이 예약된 뒤(이미지 로딩 등으로 지연되는 사이) 배틀 프리뷰가 이미 닫혔으면, 지금은
    // #monster가 실제 포획 게임 용도로 쓰이고 있는 것이므로 절대 위치를 건드리면 안 됨
    if (!battlePreviewActive) return;
    const off = getFrontSpriteMetrics(picked.id, picked.isShiny) || {};
    const contentH = off.h || currentMonsterFrameSize;
    const pixelScale = currentMonsterFrameSize > 0 ? (currentMonsterDisplaySize / currentMonsterFrameSize) : 1;

    const boxHeight = monster.clientHeight || parseFloat(getComputedStyle(monster).height) || 0;
    const artworkTopY = (boxHeight / 2) - (contentH * pixelScale) / 2; // 박스 상단 기준 그림 윗쪽 끝 위치

    // 0번 프레임만 실측한 값으로 박스를 고정하면, 재생 중 다른 프레임(그림이 0번보다 위로 더
    // 튀어나온 프레임)에서 hp바와의 실제 간격이 WILD_INFO_GAP보다 좁아질 수 있음 — topSafety(0번
    // 프레임 상단여백 - 전체 프레임 중 최소 상단여백, pokemon_front_sprite_offsets_data.js)만큼
    // 박스를 hp바 반대 방향(아래)으로 더 밀어서, 어떤 프레임이 나와도 간격이 항상 WILD_INFO_GAP
    // 이상이 되도록 보장함(0번 프레임 등 여백이 넓은 프레임은 그만큼 더 넓어 보일 수 있음)
    const topSafety = off.topSafety || 0;

    // 스프라이트는 정보블록의 "원래(간격 확보 전) 자리" 기준 hp바 하단에 맞춰 계산함 — 정보블록
    // 자체는 WILD_INFO_GAP만큼 위로 옮겨졌지만(dexBattleDecideBtn 클릭 핸들러) 스프라이트는 그 자리에 그대로 둬서,
    // 둘 사이에 정확히 WILD_INFO_GAP 만큼의 간격이 생기게 함(monsterInfo.offsetTop을 그대로 읽으면
    // 이미 옮겨진 위치라서 간격이 다시 없어져 버림)
    const nominalHpBarBottom = WILD_INFO_TOP + WILD_INFO_NAME_BLOCK_HEIGHT + monsterInfo.offsetHeight;
    monster.style.top = `${nominalHpBarBottom - artworkTopY + topSafety * pixelScale}px`;
    // 가로 위치는 .battle-side-right(CSS, 고정 오프셋)로 처리 — 원본 게임(PLAYER_BASE_X/FOE_BASE_X)과
    // 동일하게 계산 없는 고정값
}

// ===================== 3v3 AI 트레이너 배틀 엔진 =====================
// "포켓몬 배틀"의 상대가 야생 포켓몬 1마리(hp만 있고 일방적으로 공격만 함)였던 것을, 서로 3마리씩
// 파티를 꾸려 번갈아 공격하는 실제 배틀로 확장함. 표시 요소(#monster/#monster-info 등 상대 쪽,
// #battle-back-* 내 쪽)는 기존 것을 그대로 재사용 — hp/기절/교체 개념만 양쪽에 추가됨.
//
// 공격력/방어력 등 개별 능력치(공/방/특공/특방/스피드)는 아직 반영하지 않음 — 대신 패치84부터
// 공격자의 종족치(bst) 총합을 지수함수로 환산한 보너스(+1~+10, 메가/거다이맥스는 +15 고정,
// getDamageBonus() 참고)를 기준 데미지에 더함. 데미지는 "(기준값+종족치 보너스) × 타입 상성
// 배율 × 랭크업 배율 × 치명타 배율"로 계산하고, 선공/후공은 매 턴 50:50 랜덤으로 정함. "공격하기"는
// 포켓몬마다 다른 기술 목록 대신 항상 고정된 3가지(공격/랭크업/회복)만 뜨도록 단순화했음. 공격은
// 그 포켓몬 자신의 타입을 그대로 씀(2타입이면 더 유리한 쪽 배율을 씀 — getAttackEffectiveness 참고).
// 원래는 물리/특수로 나뉘어 있었으나 데미지 공식이 완전히 동일해 하나로 통합함(종족치가 생기면
// 그때 다시 분리할지 검토 예정). 명중률(BATTLE_ACCURACY)과 치명타(BATTLE_CRIT_CHANCE/MULT)도
// 실제 포켓몬처럼 공격에만 적용되도록 단순화해서 도입함.
//
// "한쪽이 내면 다른 한쪽은 응답 대기" 구조는 실제 멀티플레이 확장을 대비해 내 행동 선택 → 상대
// 행동 선택 → 판정 순서로 짜뒀음 — AI 배틀은 AI가 그 자리에서 즉시 응답하고, 함께하기(battleMode
// 'pvp')는 그 자리만 네트워크로 바꿔 상대 행동을 기다림(mpSubmitTurnAction, pokemon_multiplayer.js).
const BATTLE_MON_MAX_HP = 100;
const BATTLE_BASE_DAMAGE = 20; // 상성 배율(0/0.25/0.5/1/2/4)과 랭크업 배율, 치명타 배율을 곱하는 기준값
const BATTLE_ACCURACY = 0.95;    // 공격 명중률(95%) — 랭크업/회복은 자기 자신 대상이라 빗나가지 않음
const BATTLE_CRIT_CHANCE = 0.05; // 치명타 확률(5%)
const BATTLE_CRIT_MULT = 2;      // 치명타 데미지 배율(2배)
// 종족치(bst) 기반 데미지 보너스 — 기준값(BATTLE_BASE_DAMAGE=20)에 1~10을 더함. 캐치 확률
// 공식(pokemon_catch.js의 CATCH_EXP_*)과 똑같이 175/500/770 세 점을 지나는 지수함수로 피팅했고,
// 구조도 완전히 동일함(C + A·exp(-K·bst)) — 다만 캐치는 감소함수라 K가 양수, 이건 증가함수라
// K가 음수. bst는 항상 원본(배율 미적용) 값만 씀. 175→+1, 500→+5, 770→+10을 정확히 지나감
// (normal 카테고리 실제 bst 범위가 정확히 175~770이라 클램프는 이론상 안전장치용).
const BATTLE_DMG_BONUS_A = 5.539371444888705;
const BATTLE_DMG_BONUS_K = -0.001381995458994817;
const BATTLE_DMG_BONUS_C = -6.054955248445392;
const BATTLE_DMG_BONUS_MIN = 1;    // bst 최저(175)일 때 보너스
const BATTLE_DMG_BONUS_MAX = 10;   // bst 최고(770)일 때 보너스
// 메가/거다이맥스는 공식 대신 고정 보너스 — 캐치 확률이 메가/거다이맥스를 고정 10%로 따로
// 처리하는 것과 같은 이유(공식이 애초에 normal bst 범위용으로 피팅됨). 곡선의 최댓값(10)보다
// 일부러 더 높게 잡아서 "귀하고 강한 개체일수록 더 세게 때린다"는 의도를 반영함
const BATTLE_DMG_BONUS_MEGA_GMAX = 15;
const BATTLE_HP_BAR_CHANGE_TIME = 1000 / 2; // ms — 기존 야생 hp바 애니메이션과 동일 속도
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
// 포켓몬 1마리당 최대 회복 횟수(무한정 회복하면서 배틀이 안 끝나는 것을 막기 위한 상한 —
// 플레이어 쪽은 횟수 제한 없음). 회복을 "언제 쓸지"는 고정 hp 임계값이 아니라 아래 AI 행동
// 스코어링(computeAiActionScores)의 연속 점수로 판단함
const AI_HEAL_MAX_USES = 2;
// 단일 타입 보정: 1타입 포켓몬이 공격할 때만 곱하는 배율. 2타입 포켓몬은 두 타입 중 더 유리한
// 쪽 배율을 그대로 쓰는 반면(getAttackEffectiveness), 1타입은 고를 게 없어 항상 자기 타입
// 하나로만 싸우다 보니 구조적으로 불리해짐 — 이를 상쇄하기 위한 보정 계수(실제 자속보정처럼
// 모든 포켓몬에 붙는 대칭적 규칙이 아니라 1타입에만 붙는 비대칭 보정임). 값(1.35)은 로스터
// 전체를 대상으로 한 배틀 시뮬레이션에서 파티 내 1타입/2타입 비율에 상관없이 승률이 가장
// 고르게 50:50에 맞춰지는 지점을 실측해서 정함
const SINGLE_TYPE_BONUS_MULT = 1.35;

// ===================== AI 행동 스코어링 상수 =====================
// AI는 매 턴 공격/랭크업/회복/교체 네 가지에 각각 점수를 매긴 뒤(computeAiActionScores) 점수
// 비례 가중 랜덤(weightedPick)으로 하나를 고름 — 고정 임계값 하나로 전부/전무를 가르지 않고,
// 상성·종족치·hp·랭크가 종합적으로 반영된 확률로 판단하게 하기 위함.
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

// 회복 점수: hp가 AI_HEAL_SOFT_CEILING 밑으로 내려가야 점수가 생기기 시작하고, 낮을수록
// 지수(AI_HEAL_SCORE_EXP)로 빠르게 커짐. 단 회복해도 다음 공격에 죽는다고 예측되거나(FUTILE)
// 이번 턴에 내가 상대를 끝낼 수 있으면(KO_OPPORTUNITY) 회복의 매력이 크게 깎임
const AI_HEAL_SOFT_CEILING = 0.7;
const AI_HEAL_SCORE_EXP = 1.5;
const AI_HEAL_FUTILE_DAMP = 0.25;
const AI_HEAL_KO_OPPORTUNITY_DAMP = 0.2;

// 교체 후보 스코어(scoreBenchCandidate)의 가중치 — 내가 상대를 때리는 정도(공격), 상대가
// 나를 때리는 정도(방어, 감점), 현재 hp비율(보조 지표). SCALE은 "벤치 최고점-현재 유지점수"
// 차이를 공격/랭크업/회복과 같은 점수 스케일로 환산하는 배율
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

// 상대(AI 트레이너)의 파티 — [{id, isShiny, hp, fainted}]. "결정하기"를 누를 때 채워짐.
// 팀 구성 기준은 아직 미정(추후 능력치가 생기면 종족치 기준으로 정할 예정)이라, 당분간은 기존
// 야생 등장 로직(pickRandomMonster, 카테고리 확률 포함)을 재사용해 3마리를 뽑음 — 팀 구성 로직만
// pickAiTeam() 안에서 교체하면 확장 가능함.
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
let mpTurn = 0;              // 함께하기 턴 번호 — 양쪽이 같은 턴의 행동끼리 짝지어졌는지 확인용
let mpMissStreak = 0;        // 상대가 연속으로 배틀 액션을 제한시간 안에 못 낸(패스로 처리된) 횟수 —
                              // 응답하면 0으로 리셋, 2번 연속이면 즉시 끊김 처리(mpForceDisconnect)
let mpSelfPassStreak = 0;    // 내가 연속으로 제한시간을 못 지켜 자동 패스한 횟수 — 상대가
                              // mpMissStreak로 감지해 방을 지우는 걸 기다리면 그 사이 이쪽 화면에
                              // 상대의 공격 멘트가 먼저 뜨는 것처럼 보이므로, 이쪽에서도 직접 세서
                              // 2번째 패스가 되는 순간 그 턴을 시작하지 않고 곧바로 끊김 처리
let mpAwaitingOpponentAction = false; // 내가 이번 턴 행동(자동 패스 포함)을 이미 보내고 상대의
                                       // 메시지를 기다리는 중인지 — true인 채로 개인 제한시간이
                                       // (그 뒤 마련된 네트워크 여유까지) 다시 다 되면 상대가
                                       // 사라진 것으로 보고 끊김 처리(메시지가 와서 mpResolveTurn이
                                       // 실행되면 false로 되돌아감 — 애니메이션 재생 중엔 이미
                                       // false라서 오탐 없음)
// 함께하기 대기 제한시간(ms) — 넷 다 "내 일이 시작되는 순간부터 도는 개인 시간" 모델로 통일함
// (상대를 기다리는 쪽이 아니라, 그 순간 할 일이 있는 쪽 화면에도 똑같이 보이고 스스로 처리함):
//  - 배틀 액션 선택: 내 메인 메뉴가 뜨는 순간부터. 놓치면 그 턴을 패스로 흘려보내고(1차),
//    상대가 연속 2번째도 패스면 그 순간 끊김 처리
//  - 강제 교체: 내 포켓몬이 기절해서 교체 메뉴가 뜨는 순간부터. 놓치면 곧바로 끊김 처리
//    (교체는 "안 함"이 없는 선택이라 배틀 액션처럼 봐줄 수 없음). 상대(기다리는 쪽)도 별도로
//    같은 값의 타이머를 가지고 있어 둘 중 먼저 시간이 다 되는 쪽이 처리함(안전망)
//  - 파티 선택: 선택 화면에 들어오는 순간부터. 도감을 살펴보며 고르는 시간과 고른 뒤 상대를
//    기다리는 시간을 하나의 연속된 시계로 봄 — 다 골랐다고 리셋되지 않고 계속 흘러감
//  - 불러오기 신호 대기: 내 쪽 에셋을 불러오기 시작하는 순간부터(끝난 뒤가 아니라)
const MP_ACTION_TIMEOUT_MS = 60000;
const MP_FORCED_SWITCH_TIMEOUT_MS = 60000;
const MP_PARTY_TIMEOUT_MS = 100000;
const MP_LOADED_TIMEOUT_MS = 100000;
let mpPartyLocked = false;   // 함께하기 선택창에서 "선택 완료"를 누르고 상대를 기다리는 중(파티 수정 불가)
let mpMyLoadSent = false;    // 내 배틀 에셋 로딩을 끝내고 'loaded' 신호를 이미 보냈는지(상대
                              // 신호를 기다리는 중인지) — 이것도 켜져 있으면 네트워크 여유를 줌
let mpRematchWaiting = false; // 함께하기 결과 화면에서 "다시하기"를 누르고 상대를 기다리는 중
let mpPickerDisconnected = false; // 함께하기 선택창에서 상대가 나가 끊김 안내를 보여주는 중(잠시 뒤 시작화면으로)
// 선택창 끊김 안내(버튼 글자라 즉시 다 보임)를 보여준 뒤 시작화면으로 넘어가기까지의 시간(ms) — 사용자 지정으로
// 승패·배틀 중 끊김 멘트의 머무는 시간(BATTLE_SCREEN_TRANSITION_HOLD, 1초)과 별개로 1.5초
const MP_PICKER_DISCONNECT_HOLD_MS = 1500;

// 임시 AI 팀 구성 — 기존 야생 등장 확률(pickRandomMonster)을 그대로 재사용
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

// 공격자 타입별 배율(getTypeEffectiveness) 중 더 높은 쪽 — 단일 타입 보정을 적용하기 전
// "순수 상성 배율"(방어 측 다중 타입 곱연산은 getTypeEffectiveness 내부에서 그대로 반영됨).
// 실제 포켓몬처럼 데미지 멘트 판정은 이 값만 봐야 해서(자속류 보정이 섞이면 안 됨) 별도 함수로 뺌
function getBaseTypeMultiplier(attackerTypes, defenderTypes) {
    const types = attackerTypes || [];
    if (types.length === 0) return 1;
    return Math.max(...types.map(t => getTypeEffectiveness(t, defenderTypes)));
}

// 공격은 "공격하는 포켓몬 자신의 타입"을 그대로 씀(최대 2개) — 실제 대전에서 유리한
// 기술을 골라 쓰는 것과 같은 효과를 내도록 getBaseTypeMultiplier를 최종 배율로 쓰되, 1타입
// 포켓몬은 여기에 단일 타입 보정(SINGLE_TYPE_BONUS_MULT)까지 곱함(이유는 상수 선언부 주석
// 참고). 데미지 계산 전용이며, 멘트 판정에는 쓰지 않음(getBaseTypeMultiplier 참고)
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

// 벤치 후보(또는 지금 나가있는 개체) 한 마리의 "이 상대와 붙었을 때 종합 가치" 점수.
// offense: 이 개체가 상대를 때리는 예상 데미지 비율. defense: 상대가 이 개체를 때리는 예상
// 데미지 비율(낮을수록 좋아서 감점). hp: 현재 체력 비율(보조 지표). candidateRank는 "그대로
// 유지"면 누적 랭크, "교체로 새로 들어옴"이면 항상 0(교체 시 랭크가 리셋되는 기존 규칙과 일치)
// — 그래서 랭크를 많이 쌓은 개체는 교체로 잃을 게 많아져 자연스럽게 안 바뀌는 쪽으로 기움.
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

// AI가 매 턴 낼 행동(공격/랭크업/회복/교체) 네 가지에 각각 점수를 매김 — 팬게임(Pokemon
// Essentials) AI의 "기술마다 점수를 매겨 가중 랜덤으로 고른다" 구조를, 우리 게임이 가진 요소
// (상성 양방향·종족치·hp·랭크)만으로 재구성한 것. defenderId/defenderHp는 상대(플레이어) 활성
// 개체의 id/hp — KO 예측과 위협도 계산에 필요.
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

// ===================== hp바 표시/애니메이션 (상대 · 나 공통 패턴) =====================
// 색상 기준(50%/25%)과 선형 애니메이션은 기존 야생 hp바(원본은 Pokemon Essentials의
// Battle_Scene_Objects.rb — refresh_hp/animate_hp/update_hp_animation)와 동일하게 유지

// fillEl(hp가 채워지는 막대 요소) 하나를 맡는 hp바 — 지금 화면에 그려지는 hp(애니메이션 도중에는
// 목표값과 다름)와 진행 중인 애니메이션을 자기 안에 보관함. 상대/나 모두 이 함수로 만든 것을 씀
//   animate(from, to, onDone): from → to로 BATTLE_HP_BAR_CHANGE_TIME 동안 선형 애니메이션 후 onDone
//   reset(hp): 애니메이션 없이 바로 hp로 맞춤(교체·새 배틀 시작)
//   cancel(): 진행 중인 애니메이션만 멈춤(배틀을 도중에 닫을 때)
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

// 기절 연출 공통 로직 — boxEl(바깥 박스)의 그림 최하단 픽셀에 clip-path로 땅 라인을 고정하고
// spriteEl(안쪽 그림)만 그 아래로 일정 속도로 미끄러뜨림. contentHeightOnScreen: 그림(투명 제외)의
// 화면상 실제 높이(px) — 박스 정중앙에 그림 중심이 오도록 배치되어 있다는 전제로 땅 라인을 계산함
function playFaintSink(boxEl, spriteEl, contentHeightOnScreen, onComplete) {
    const boxHeight = boxEl.clientHeight || parseFloat(getComputedStyle(boxEl).height) || 0;
    const artworkBottomY = (boxHeight / 2) + (contentHeightOnScreen / 2);
    const groundClipInset = Math.max(0, boxHeight - artworkBottomY);

    const travelDistance = contentHeightOnScreen + WILD_FAINT_CLEAR_BUFFER;
    const duration = Math.min(WILD_FAINT_MAX_DURATION,
        Math.max(WILD_FAINT_MIN_DURATION, travelDistance / WILD_FAINT_SPEED));

    boxEl.style.clipPath = `inset(0 0 ${groundClipInset}px 0)`;

    const restoreTransform = spriteEl.style.transform || '';
    spriteEl.style.transition = `transform ${duration}ms ease-in`;
    void spriteEl.offsetHeight;
    spriteEl.style.transform = `${restoreTransform} translateY(${travelDistance}px)`;

    setTimeout(battleCallback(onComplete), duration);
}

// 상대(AI) 포켓몬 기절 연출 — #monster 기준, 그림 높이는 SPRITE_OFFSETS 실측값(0번 프레임) × 표시 배율
function playAiFaintAnimation(onComplete) {
    stopShinyAnimation();
    shinyEffect.classList.add('hidden');

    const off = getFrontSpriteMetrics(currentMonsterId, currentIsShiny) || {};
    const contentH = off.h || currentMonsterFrameSize;
    const pixelScale = currentMonsterFrameSize > 0 ? (currentMonsterDisplaySize / currentMonsterFrameSize) : 1;
    playFaintSink(monster, monster.querySelector('#monster-sprite'), contentH * pixelScale, onComplete);
}

// 내 포켓몬(뒷모습) 기절 연출 — 그림 높이는 displayBackSprite()가 저장해 둔 currentBackContentHeight
// (BACK_SPRITE_OFFSETS 실측값 × 표시 배율). 상대 쪽과 같은 공통 로직(playFaintSink)을 씀
function playPlayerFaintAnimation(onComplete) {
    stopBackShinyAnimation();
    battleBackShinyEffectEl.classList.add('hidden');
    playFaintSink(battleBackSpriteBoxEl, battleBackSpriteEl, currentBackContentHeight || 0, onComplete);
}

// ===================== 공격 연출 =====================

const ATTACK_LUNGE_DISTANCE = 28;   // px — 공격자가 상대 쪽으로 튀어나가는 거리
const ATTACK_LUNGE_OUT_MS = 65;     // ms — 상대 쪽으로 튀어나가는 시간
const ATTACK_LUNGE_BACK_MS = 115;   // ms — 제자리로 돌아오는 시간
const ATTACK_HIT_BLINK_COUNT = 4;   // 피격 시 깜빡이는 횟수(실제 게임의 피격 점멸)
const ATTACK_HIT_BLINK_DURATION = 320; // ms — 점멸 전체 길이

// 진행 중인 공격 연출 — 배틀을 도중에 닫으면 cancel()해서 뒤이은 콜백(데미지/멘트)이 안 돌게 함
let runningAttackAnims = [];

// 스프라이트 박스는 CSS transform(translateX(-50%) 등)으로 위치를 잡고 있어서, transform 대신
// 개별 속성인 translate를 애니메이션해 기존 위치 계산과 겹치지 않게 함. fill을 안 쓰므로 끝나면
// 인라인 스타일에 아무 흔적도 남지 않음
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

// 원작(another_red_aio)의 칼춤/HP회복 스프라이트 시트를 원작 애니메이션 움직임대로 한 프레임씩
// 합성해 가로로 이어붙인 필름스트립 — 이로치 이펙트(shiny.png)와 같은 규칙(프레임 = 모든 프레임을
// 합친 최대 범위, 중심 = 그 범위의 중심)으로 잘라 둬서 크기·위치를 이로치와 같은 로직으로 계산함.
// 색 변화(원작의 tone)는 넣지 않았음
const BATTLE_EFFECTS = {
    // 원작 칼춤은 칼들이 머리 근처에 모임 — 원작에서 칼들의 최대 범위 중심(포켓몬 중심보다 61px 위)이 기준 포켓몬
    // (키 128)의 머리 끝(64px 위)과 거의 같은 높이라서, 칼 무리 중심을 포켓몬 머리 끝(키의 절반 위)에 맞춤
    SWORDS_DANCE: { src: 'images/pokemon/battle/swords_dance.png', frameCount: 21, offsetY: -0.5 },
    RECOVER:      { src: 'images/pokemon/battle/recover.png',      frameCount: 9 },
};

// 첫 재생 때 그림이 늦게 떠서 깜빡이지 않도록 미리 받아둠
Object.values(BATTLE_EFFECTS).forEach(effect => { new Image().src = effect.src; });

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

// 교체 가능한(기절하지 않았고 지금 안 나가있는) 포켓몬이 하나도 없으면 "포켓몬" 버튼을
// 비활성화함 — 예전엔 눌러서 열어봐야 "교체할 포켓몬이 없다"는 걸 알 수 있었는데,
// 이제는 애초에 누를 수 없는 상태로 미리 보여줌
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

// 기술/교체 메뉴의 뒤로가기(‹) 버튼 — images/pokemon/layout/left_arrow.png(세로 8프레임,
// 프레임당 40x28px)를 0.5배로 표시(20x14px)해서 계속 반복 재생함. 화면에 항상 떠 있는
// 장식용 아이콘이라 배틀 진행 상태와 무관하게 스크립트 로드 시 바로 시작해서 계속 돎.
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
// 포켓몬마다 다른 기술 목록 대신, 항상 이 3개만 뜸(타입/카테고리 아이콘도 안 씀 — 텍스트만).
// 원래는 물리/특수로 나뉘어 있었으나 데미지 공식이 완전히 같아 "공격" 하나로 통합함
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

// 기절 처리: 기절 연출 → 메시지 표시 → (그 진영이 전멸했으면 승패 결과, 아니면 다음 포켓몬으로
// 교체 — 내 쪽은 강제 교체 메뉴, 상대는 자동) → onDone. 실제 포켓몬 게임은 다른 배틀 이벤트(공격/
// 회복/교체 등)와 달리 기절만큼은 "먼저 선언 멘트 → 그 결과가 일어남" 순서가 아니라 "포켓몬이
// 먼저 시각적으로 쓰러지고 → 그 연출이 끝난 뒤에 쓰러졌다는 텍스트가 뜨는" 반대 순서라, 이를
// 반영해 연출을 먼저 재생하고 멘트를 그 다음에 띄우도록 함(예전엔 멘트가 먼저 뜨고 한참(타이핑+
// 대기 약 1.2초) 있다가 뒤늦게 쓰러지는 연출이 나와 어색했음)
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
            if (battleMode === 'pvp') { mpWaitForcedSwitch(onDone); return; }
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

// 상대(AI) 쪽을 지정한 인덱스의 포켓몬으로 내보냄 — 기존 spawnNextBattleWildMonster()와 동일한
// 페이드아웃→페이드인 연출을 재사용함. 기절로 인한 강제 교체(autoSwitchAiNext)와, AI의 자진 교체
// (pickAiTurnAction이 { switch: idx }를 골랐을 때) 양쪽이 공유해서 씀
function switchAiToIndex(targetIndex, onDone) {
    activeAiIndex = targetIndex;
    aiRank = 0;
    aiHealUses = 0;
    const entry = aiParty[activeAiIndex];
    entry.known = true; // 전장에 나온 순간부터 상태 확인 창에서 정체가 공개됨

    const nextInfo = POKEMON_DATA[entry.id] || { name: '???' };

    showBattleMessage(`상대가 ${nextInfo.name}을(를) 내보냈다!`, () => {
        const monsterObj = partyEntryToMonsterObj(entry);
        const preloadPromise = preloadImage(monsterObj.src);

        // 내 포켓몬 등장(applyPlayerSwitch)과 동일한 타이밍으로 맞춤 — opacity를 0으로 만드는
        // 시점에 hidden도 같이 벗겨서 "보이지만 투명한" 상태로 400ms를 흐르게 함. display:none에서
        // 곧바로 opacity를 바꾸면 CSS transition이 스킵되므로 반드시 이 순서를 지켜야 함(교체 때는
        // 이미 hidden이 없어 무해함). #monster-info/#monster-info-text도 여기서 같이 벗겨야 함 —
        // updateMonsterInfo()의 remove('hidden') 시점(=opacity 올리는 시점과 같은 틱)에만 맡기면
        // 트랜지션 없이 즉시 팝업되므로, 여기서 먼저 벗겨서 동일하게 페이드인시킴(중복 호출은 무해함).
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
            // 포획 게임(initGame)/내 포켓몬(applyPlayerSwitch)과 동일하게, 체력바도 opacity를
            // 1로 올리기 "전"에 반드시 세팅해야 함 — 페이드인 이후(setTimeout 안)로 미루면 체력바만
            // 뒤늦게 채워지는 문제가 생김(배틀 시작 첫 등장/배틀 중 교체 둘 다 이 함수를 재사용함).
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

// 기절해서 강제로 다음 포켓몬으로 넘어갈 때 — 자진 교체(pickAiTurnAction)와 같은 후보 스코어
// 함수(scoreBenchCandidate, 상성 양방향+hp 반영)를 재사용하되, "그냥 나가있기" 선택지가 없는
// 강제 상황이라 확률 없이 항상 남은 생존 개체 중 최고점을 확정적으로 내보냄(동률이면 배열상
// 먼저 나오는 쪽). 순수 상성 배율만 보던 예전 방식보다 "상대에게 얼마나 잘 버티는가"까지
// 반영되어, 상성은 비슷해도 덜 위협받는 쪽을 우선하게 됨.
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

// 내 포켓몬이 기절했을 때 — 자진 교체와 동일한 방식(액션박스 안 이름 버튼 목록,
// renderBattleSwitchInlineMenu)을 그대로 씀. 다만 취소는 불가능해야 하므로 뒤로가기(‹) 버튼은
// 숨기고, 이름 버튼을 누르면 별도 확인 없이 "가랏! ~!" 멘트 후 적용되어 onDone이 실행되며 턴 진행이 이어짐.
function openForcedSwitch(onDone) {
    battleSwitchForced = true;
    pendingForcedSwitchCallback = onDone;
    renderBattleSwitchInlineMenu();
    battleMessageBoxEl.classList.add('hidden');
    battleMessageBoxEl.textContent = '';
    battleMainMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.remove('hidden');
    // 상대(기다리는 쪽)의 mpWaitForcedSwitch와 같은 값의 별도 타이머 — 고르는 쪽도 시간 제한을
    // 직접 보고, 못 고르면 상대의 감지를 기다리지 않고 스스로 끊김 처리
    if (battleMode === 'pvp') {
        window.mpStartDeadline(battleTurnTimerEl, MP_FORCED_SWITCH_TIMEOUT_MS, () => {
            window.mpForceDisconnect();
        });
    }
}

// 승패 결정 시 다른 배틀 이벤트들과 동일하게 액션박스 멘트로 먼저 알린 뒤(showBattleMessage)
// 그 멘트가 끝나야 결과 화면이 뜨도록 함. 결과 화면(#battle-result-overlay)엔 승패를 다시
// 텍스트로 띄우지 않음 — 배틀 쪽엔 아직 학습 데이터 연계 통계(점수/정답/오답) 시스템이 없어서
// 비워둠(포획 게임처럼 통계 기능이 추가되면 채울 예정). 승패는 액션박스 멘트로 충분히 전달됨.
function endBattleWithResult(didWin) {
    battleTurnBusy = false;
    const resultText = didWin ? '상대와의 승부에서 이겼다!' : '상대와의 승부에서 졌다!';
    showBattleMessage(resultText, () => {
        battleMessageBoxEl.classList.add('hidden');
        battleMessageBoxEl.textContent = '';
        battleResultOverlayEl.classList.remove('hidden');
    }, BATTLE_SCREEN_TRANSITION_HOLD);
}

// 내 포켓몬을 battleParty[targetIndex]로 바꿔치기(화면 갱신)만 함 — 메시지 유무는 호출하는 쪽
// 책임(강제 교체는 "가랏! ~!", 자진 교체는 resolveSingleAction이 먼저 안내한 뒤 호출함).
// 상대(AI)의 switchAiToIndex와 동일하게 페이드아웃 → 새 스프라이트 미리 로드 → 페이드인 연출로
// 나가는 포켓몬이 사라지고 새 포켓몬이 나타나는 것처럼 보이게 함.
function applyPlayerSwitch(targetIndex, onDone) {
    const entry = battleParty[targetIndex];
    // displayBackSprite()가 실제로 쓰는 것과 동일한 1차 후보 경로를 미리 로드해둠(폼 전용 뒷모습이
    // 없어서 종 기준형으로 폴백하는 극히 드문 경우엔 그 폴백 자체는 미리 로드되지 않지만, 어차피
    // displayBackSprite()가 알아서 재시도하므로 게임 진행에는 영향 없음)
    const backOff = backSpriteInfo(entry.id, entry.isShiny);
    const preloadPromise = backOff ? preloadImage(backOff.src) : Promise.resolve();

    battleBackSpriteBoxEl.style.opacity = '0';
    battleBackInfoEl.style.opacity = '0';
    battleBackInfoTextEl.style.opacity = '0';

    const fadeOutPromise = new Promise(resolve => setTimeout(resolve, MONSTER_SHRINK_DURATION));

    Promise.all([fadeOutPromise, preloadPromise]).then(battleCallback(() => {
        activePartyIndex = targetIndex;
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
        renderTypeBadges(battleBackTypesEl, backInfo.types);
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

// 행동 하나(공격/랭크업/회복/교체)를 실제로 적용. onDone(defenderFainted)는 연출·후처리가
// 모두 끝난 뒤 호출됨(defenderFainted는 공격으로 상대를 쓰러뜨렸을 때만 true). action이 문자열
// ('attack'/'rankup'/'heal')이면 기존과 동일하게, { switch: 대상 인덱스 } 객체면
// 자진 교체를 처리함 — 교체 순서는 startPlayerTurn()이 정하므로 여기선 "이 한 번의 행동"만 신경 씀.
// roll({ hit, crit }): 함께하기에서 호스트가 미리 굴려 보낸 명중/치명타 판정 — 양쪽이 같은 값으로
// 계산해야 hp가 어긋나지 않음. 없으면(AI 배틀) 기존처럼 그 자리에서 Math.random()으로 굴림
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
            // 공격 데미지(HP 애니메이션 먼저 → 효과 멘트)와 순서를 맞춤 — 예전엔 "체력을
            // 회복했다!" 멘트가 먼저 뜨고 그 다음에야 HP가 차올랐는데, 반대로 HP가 먼저 차오르는
            // 애니메이션이 끝난 뒤에 성공 멘트가 뜨도록 순서를 바꿈
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
            // 상성 배율을 5단계로 세분화 — 4배 이상/0.25배 이하는 "매우" 문구를
            // 따로 쓰고, 무효(0배)는 실제 게임처럼 방어 포켓몬 이름을 넣어서 표시.
            // 실제 포켓몬처럼 이 판정은 순수 상성(baseMult)만 보고, 단일 타입 보정이나 치명타가
            // 섞인 typeMult/dmg(데미지 계산 전용)는 여기서 쓰지 않음
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

// 한 턴(양쪽 행동이 각각 1회씩) 진행 — 순서는 startPlayerTurn()이 미리 정해서 넘겨줌. 선공의
// 공격으로 후공 쪽이 기절했으면(defenderFainted) 후공은 이번 턴에 움직이지 않고 바로 턴이
// 끝남(실제 포켓몬 게임과 동일 — 교체는 데미지를 주지 않으므로 이 경우는 공격 행동에만 해당).
// rolls: 함께하기에서만 넘어오는 { player: {hit, crit}, ai: {hit, crit} }(AI 배틀은 undefined)
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

// 함께하기 배틀 액션 선택 개인 제한시간 — 내 메인 메뉴가 뜬 시점부터 60초. 시간 안에 못
// 고르면 자동으로 '패스'를 낸 것처럼 처리해(startPlayerTurn과 완전히 같은 경로) 그 턴만
// 흘려보냄. 연속 여부 판단(끊김 처리)은 mpResolveTurn이 함
function startMyActionDeadline() {
    if (battleMode !== 'pvp' || !battlePreviewActive || battleEnded) return;
    window.mpStartDeadline(battleTurnTimerEl, MP_ACTION_TIMEOUT_MS, () => {
        if (battleMode !== 'pvp' || battleEnded) return;
        // 내가 이미 행동을 보내고 상대 메시지를 기다리는 중(mpAwaitingOpponentAction)인데
        // 여기까지 왔다는 건, 상대가 자기 제한시간을 넘겼는데도(그래서 상대 쪽에서 자동
        // 패스/끊김 처리가 됐어야 함) 그 메시지조차 이쪽에 안 왔다는 뜻 — 상대가 사라진
        // 것으로 보고 곧바로 끊김 처리
        if (mpAwaitingOpponentAction) { window.mpGraceThenDisconnect(); return; }
        mpSelfPassStreak++;
        if (mpSelfPassStreak >= 2) { window.mpForceDisconnect(); return; }
        startPlayerTurn('pass');
    });
}

function finishTurn() {
    battleTurnBusy = false;
    showBattleMainMenuUI();
    startMyActionDeadline();
}

// 이번 턴에 낼 내 행동이 정해졌을 때(기술 선택 또는 자진 교체 확정) 공통으로 거치는 진입점.
// AI도 그 자리에서 즉시 행동을 고르고(pickAiTurnAction — 교체/회복/랭크업/공격), 순서를 정한 뒤
// 턴을 진행함. 순서 규칙: 교체는 항상 싸우기(공격/랭크업/회복)보다 먼저 실행되고, 양쪽 다
// 교체를 선택했으면 어느 쪽이 먼저인지는 기술이 나갈 때와 동일하게 랜덤으로 정함
function startPlayerTurn(playerAction) {
    // 타이머를 여기서 지우지 않음 — 내가 행동을 내도 화면엔 상대 응답을 기다리는 동안 계속
    // 같은 타이머가 흘러가게 둠(상대가 안 오면 startMyActionDeadline의 타임아웃이 대신
    // 감지해서 끊김 처리). 다음 턴이 시작되면 startMyActionDeadline이 새 타이머로 자연히 덮어씀
    if (playerAction !== 'pass') mpSelfPassStreak = 0;
    battleTurnBusy = true;
    battleMoveMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.add('hidden');

    // 상대가 사람이면 AI 대신 상대의 선택을 네트워크로 기다림(mpSubmitTurnAction)
    if (battleMode === 'pvp') { mpAwaitingOpponentAction = true; mpSubmitTurnAction(playerAction); return; }

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

// ===================== 함께하기(pvp) 동기화 =====================
// 액션박스를 타이핑 없는 고정 문구(통신 대기 중/불러오는 중)로 바꿈 — 다음 showBattleMessage()가
// 오면 그대로 덮어써짐. 상대 메시지가 이미 와 있으면 같은 틱 안에 덮어써져서 화면엔 안 보임
function showBattleWaiting(text) {
    cancelTypeMessage(battleMessageBoxEl);
    battleMainMenuEl.classList.add('hidden');
    battleMoveMenuEl.classList.add('hidden');
    battleSwitchInlineMenuEl.classList.add('hidden');
    battleMessageBoxEl.classList.remove('hidden');
    battleMessageBoxEl.textContent = text;
}

// 이번 턴의 랜덤 판정을 호스트가 미리 굴림 — first: 선공(교체끼리/싸우기끼리일 때만 씀),
// host/guest: 각자 공격했을 때의 명중/치명타. 행동을 고르기 전에 굴려도 확률은 똑같음
function mpRollTurn() {
    const rollAttack = () => ({ hit: Math.random() < BATTLE_ACCURACY, crit: Math.random() < BATTLE_CRIT_CHANCE });
    return { first: Math.random() < 0.5 ? 'host' : 'guest', host: rollAttack(), guest: rollAttack() };
}

// 상대가 보낸 행동이 지금 상태에서 말이 되는지 확인 — 이상하면 공격으로 대체(양쪽 상태가 같으면
// 정상 클라이언트끼리는 절대 대체되지 않음)
function mpSanitizeAction(action) {
    if (action === 'attack' || action === 'rankup' || action === 'heal' || action === 'pass') return action;
    if (action && typeof action === 'object' && Number.isInteger(action.switch)) {
        const target = aiParty[action.switch];
        if (target && !target.fainted && action.switch !== activeAiIndex) return { switch: action.switch };
    }
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

// 내 행동을 상대에게 보내고, 상대 행동이 오면(이미 와 있으면 즉시) 이번 턴을 판정·진행함.
// 호스트는 자기 행동 메시지에 이번 턴 랜덤 판정(mpRollTurn)을 실어 보냄 — 그래서 어느 쪽이든
// "양쪽 행동이 다 모인 순간" 곧바로 같은 결과로 진행할 수 있음(게스트가 판정을 따로 기다리지 않음)
function mpSubmitTurnAction(playerAction) {
    const turn = mpTurn;
    const myMsg = { turn, action: playerAction };
    if (mp.isHost) myMsg.rolls = mpRollTurn();
    mpSend('action', myMsg);
    showBattleWaiting('통신 대기 중...');
    mpWaitFor('action', battleCallback((oppMsg) => {
        mpTurn = turn + 1;
        const rolls = mp.isHost ? myMsg.rolls : oppMsg.rolls;
        mpResolveTurn(playerAction, mpSanitizeAction(oppMsg.action), rolls);
    }));
}

// 양쪽 행동+판정값으로 순서를 정해 턴을 진행 — 순서 규칙은 AI 배틀(startPlayerTurn)과 동일
// (교체가 싸우기보다 먼저, 나머지는 50:50). host/guest를 내 화면 기준 player/ai로 바꿔 씀
function mpResolveTurn(myAction, oppAction, rolls) {
    mpAwaitingOpponentAction = false;
    // 상대 메시지가 왔으므로 내 개인 타이머(+네트워크 여유)는 더 이상 필요 없음 — 다음 턴
    // 타이머가 시작될 때(finishTurn) 자연히 덮어써지긴 하지만, 그 사이(애니메이션 재생 등)에
    // 남아있던 타이머가 먼저 만료되어 이미 끝난 턴에 대해 잘못 동작하는 걸 막기 위해 즉시 지움
    window.mpClearDeadlineTimer();
    // 상대가 이번 턴도 패스(제한시간 초과)면 연속 카운트 증가 — 2번 연속이면 더 기다리지 않고
    // 곧바로 끊김 처리(기존 mpOnDisconnect 흐름 재사용). 응답했으면(패스가 아니면) 카운트 리셋
    if (oppAction === 'pass') {
        mpMissStreak++;
        if (mpMissStreak >= 2) { window.mpForceDisconnect(); return; }
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

    runTurnSequence(order, { player: myAction, ai: oppAction }, { player: rolls[me], ai: rolls[opp] });
}

// 상대 포켓몬이 기절했을 때 — 상대가 강제 교체 메뉴에서 고른 포켓몬이 올 때까지 기다렸다가 내보냄
function mpWaitForcedSwitch(onDone) {
    showBattleWaiting('통신 대기 중...');
    // 이 쪽은 항상 "상대의 선택을 기다리는" 상황이라 그레이스를 바로 적용
    window.mpStartDeadline(battleTurnTimerEl, MP_FORCED_SWITCH_TIMEOUT_MS, () => {
        window.mpGraceThenDisconnect();
    });
    mpWaitFor('forcedSwitch', battleCallback((data) => {
        window.mpClearDeadlineTimer();
        let idx = data && data.idx;
        const target = aiParty[idx];
        if (!target || target.fainted) idx = aiParty.findIndex(p => !p.fainted);
        switchAiToIndex(idx, onDone);
    }));
}

// 함께하기 배틀 시작 전 프리로드 — 내 3마리 뒷모습(폼 전용이 없으면 종 기준형), 내/상대 6마리
// 앞모습(상대 등장·상태 확인 창), 상태 확인 창의 물음표 이미지. 실패·시간초과여도 진행은 막지 않음
const MP_PRELOAD_TIMEOUT_MS = 8000;
function mpLoadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = src;
        setTimeout(() => resolve(false), MP_PRELOAD_TIMEOUT_MS);
    });
}
function mpPreloadBattleAssets() {
    const jobs = [mpLoadImage(STATUS_UNKNOWN_SPRITE_SRC)];
    battleParty.forEach(entry => {
        const info = backSpriteInfo(entry.id, entry.isShiny);
        if (info) {
            jobs.push(mpLoadImage(info.src).then(ok => {
                const fallback = !ok && baseBackSpriteInfo(entry.id, entry.isShiny);
                return fallback ? mpLoadImage(fallback.src) : ok;
            }));
        }
    });
    battleParty.concat(aiParty).forEach(entry => jobs.push(mpLoadImage(frontSpriteSrc(entry.id, entry.isShiny))));
    return Promise.all(jobs);
}

// 상대와 연결이 끊겼을 때(pokemon_multiplayer.js가 부름) — 지금 화면(배틀·결과 화면 / 선택창)에 맞게
// 버튼·액션박스 문구로 안내함. 별도 알림창은 없음
mpOnDisconnect = () => {
    window.mpClearDeadlineTimer();
    if (battleMode === 'pvp' && battlePreviewActive) {
        // 상대가 없으니 재대결 불가 — 다시하기는 회색 비활성화(처음으로만 가능). 다시하기를 눌러
        // 상대를 기다리던 중이었다면 버튼의 "대기 중"을 끊김 안내로 바꿈. 별도 알림창은 띄우지 않음
        battleResultRetryBtn.disabled = true;
        if (mpRematchWaiting) battleResultRetryBtn.textContent = '상대와의 통신이 끊어졌습니다';
        mpRematchWaiting = false;
        if (battleEnded) return; // 이미 승패가 났으면(결과 화면) 버튼만 바꾸고 끝

        // 진행 중인 연출·대기 콜백을 전부 끊고(세션 교체) 끊김 멘트 후 결과 화면으로
        battleSessionId++;
        closeBattleStatus();
        cancelAttackAnimations();
        stopBattleEffect();
        aiHpBar.cancel();
        playerHpBar.cancel();
        battleEnded = true;
        battleTurnBusy = true;
        battleSwitchForced = false;
        pendingForcedSwitchCallback = null;
        showBattleMessage('상대와의 통신이 끊어졌습니다', () => {
            battleMessageBoxEl.classList.add('hidden');
            battleMessageBoxEl.textContent = '';
            battleResultOverlayEl.classList.remove('hidden');
        }, BATTLE_SCREEN_TRANSITION_HOLD);
        return;
    }
    // 선택창(도감 선택 모드)에서 끊기면 — 배틀 중 끊김(액션박스 멘트 → 결과 화면)과 같은 흐름으로,
    // 선택 완료(또는 대기 중) 자리에 끊김 안내를 띄우고(랜덤 선택은 숨김) 잠시 후 시작화면으로.
    // 별도 알림창은 띄우지 않음
    if (dexPickerMode) {
        mpPartyLocked = true;
        mpPickerDisconnected = true;
        renderBattleSlots();
        setTimeout(() => {
            if (!mpPickerDisconnected || !dexPickerMode) return; // 그 사이 직접 ×로 닫았으면 무시
            stopDexInfoSpriteAnimation();
            dexModal.classList.add('hidden');
            dexPickerMode = false;
            battleParty = [];
            mpPartyLocked = false;
            mpPickerDisconnected = false;
            dexBattleRandomBtn.classList.remove('hidden');
            battleSlotController.stopAll();
        }, MP_PICKER_DISCONNECT_HOLD_MS);
        return;
    }
};

// ===================== 배틀 중 포켓몬 교체 =====================
// 자진 교체/강제 교체 둘 다 액션박스 안 이름 버튼 목록(renderBattleSwitchInlineMenu, 바로 아래)
// 으로 통일되어 있음. "포켓몬" 버튼을 누르면(자진 교체) "싸운다"의 기술 메뉴와 같은 자리에
// 교체 가능한 포켓몬 이름 버튼만 나열하고, 버튼을 누르면 바로 그 포켓몬으로 교체를 "선택"한
// 것으로 치며(별도 확인 버튼 없음) startPlayerTurn()으로 넘어감(교체는 항상 싸우기보다 먼저
// 실행됨). 지금 나가있거나 기절한 슬롯은 목록에서 아예 뺌 — 교체 가능한 포켓몬만 버튼으로 나옴.
// 이름 옆에는 types_short.png(28x560, TYPE_ICON_INDEX 재사용)로 만든 작은 타입 아이콘을 붙임.
// 기절 교체/자진 교체 둘 다 이 함수 하나를 그대로 같이 쓰므로 자동으로 동일하게 동작함.
function renderBattleSwitchInlineMenu() {
    // 강제 교체(기절) 중엔 취소가 불가능해야 하므로 뒤로가기(‹) 버튼을 숨김 — 예전 오버레이의
    // "취소 버튼 숨김"과 동일한 역할
    battleSwitchInlineBackBtn.classList.toggle('hidden', battleSwitchForced);

    battleSwitchInlineListEl.innerHTML = '';

    // "교체할 포켓몬이 없다..." 분기는 삭제함 — 자진 교체는 후보가 없으면 "포켓몬" 버튼
    // 자체가 비활성화되고(updateBattleSwitchBtnState), 강제 교체는 나머지 전멸 시 이 메뉴가
    // 열리기 전에 승패가 먼저 갈리므로(handleFaint) candidates가 비어서 여기 도달할 일이 없음
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
            // 기절로 인한 강제 교체는 턴 진행 중(battleTurnBusy=true)에 열리므로, 그 상태를
            // 무시하고 즉시 적용 → 원래 이어지던 턴 처리(pendingForcedSwitchCallback)를 계속함.
            // 자진 교체는 기존과 동일하게 이번 턴 행동으로 넘겨서 AI 행동과 함께 판정함
            if (battleSwitchForced) {
                battleSwitchForced = false;
                battleSwitchInlineMenuEl.classList.add('hidden');
                if (battleMode === 'pvp') {
                    window.mpClearDeadlineTimer();
                    mpSend('forcedSwitch', { idx });
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
// 전용 목록 화면 대신, "포켓몬 배틀" 버튼을 누르면 dexPickerMode를 켠 채로 실제 #dex-modal을
// 그대로 염 — 검색/필터/폼 그리드(메가·거다이맥스·이로치 포함) 등 도감 로직은 전혀 손대지 않고,
// 그 위에 배틀 슬롯 바(#dex-battle-slot-row)와 정보 화면의 "슬롯에 추가" 버튼만 조건부로 덧붙임
let selectedBattleId = null;
let selectedBattleIsShiny = false;

// #dex-modal이 지금 "포켓몬 배틀"로 열려 선택 모드인지("포켓몬 도감"으로 열린 일반 브라우징과 구분)
let dexPickerMode = false;

// 배틀에 나갈 포켓몬(최대 3마리) — 도감 정보 화면에서 고른 순서대로 앞에서부터 채워짐. 각 원소는
// { id, isShiny, hp, fainted }(hp/fainted는 "결정하기"를 누를 때 채워짐 — 그 전엔 선택 목록일
// 뿐이라 없음). "결정하기"를 누르면 이 중 맨 앞(battleParty[0])이 뒷모습 프리뷰의 주인공으로 쓰임
let battleParty = [];
const battleSlotEls = Array.from(dexBattleSlotRowEl.querySelectorAll('.battle-slot'));

// 지금 배틀 중 나가있는 포켓몬이 battleParty의 몇 번째인지 — 액션박스의 "포켓몬" 버튼 또는 기절로
// 교체될 때 바뀜. 결정하기를 누른 시점엔 항상 0(맨 앞)에서 시작함
let activePartyIndex = 0;

// 배틀 프리뷰가 지금 실제로 열려 있는지 추적하는 플래그. spawnNextBattleWildMonster()/
// alignWildMonsterTopToHpBar()는 setTimeout/이미지 로딩 등으로 비동기 실행되므로, 그 사이에
// 사용자가 ×(닫기)를 눌러 포획 게임으로 돌아가면 뒤늦게 실행되는 콜백이 #monster의 위치/그림/
// hp텍스트를 또 건드려 포켓몬볼 튕기는 위치가 틀어질 수 있음(getThrowTargetBottom()이 #monster의
// 실시간 위치를 읽기 때문) — 이 플래그로 "이미 닫힌 뒤"인 콜백은 조용히 무시하도록 막을 것.
let battlePreviewActive = false;

// 배틀을 닫을 때마다(resetBattlePreview) 1씩 올라감. 턴 진행은 메시지 대기·페이드·기절 연출 등
// setTimeout/Promise 콜백의 연쇄라서, 도중에 닫아도 연쇄가 계속 돌며 비워진 aiParty를 건드리거나
// 곧바로 시작한 새 배틀의 hp·메뉴를 바꿔 버림 — 예약할 때의 세션이 아니면 콜백을 버리도록 감쌈
// (battlePreviewActive만으로는 새 배틀이 이미 열려 true로 돌아온 경우를 못 막음)
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

// 슬롯 배열(.battle-slot 엘리먼트들) 하나에 대해 "앞모습 애니메이션 재생/정지/비우기"를 전담하는
// 컨트롤러를 만듦 — 배틀 선택 슬롯(dexBattleSlotRowEl) 전용. #dex-info-sprite와 동일한 계산식
// (renderDexInfoSprite 참고)으로 정지 아이콘 대신 실제 움직이는 앞모습 애니메이션을 슬롯 박스
// 크기에 맞게 재생함. 슬롯마다 독립된 토큰/타이머를 두어, 슬롯 내용이 빠르게 바뀌어도(연속 클릭
// 등) 늦게 도착한 이미지 로딩 결과가 엉뚱한 슬롯을 덮어쓰지 않도록 함.
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

// battleParty 배열 상태를 슬롯 3칸 + 결정하기 버튼(라벨의 "n/3"과 활성화)에 반영하고, 지금
// 폼 그리드가 열려 있으면 그 안의 체크 배지(.in-party)도 같이 최신화함. battleParty를 바꾸는
// 모든 곳(폼 칸 클릭, 슬롯 클릭, 선택 모드 진입/종료)이 마지막에 이 함수 하나만 부르면 화면이
// 전부 일관되게 갱신됨
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

    // "결정하기 (n/3)" 라벨을 없애고 그냥 "결정하기"로 고정, 3마리를 전부 채워야만
    // 눌리도록 함(예전엔 1마리만 있어도 눌렸음)
    // 함께하기에서 선택 완료를 누른 뒤 상대가 아직 고르는 중이면 "대기 중"으로 바뀌고 회색 비활성화
    // (3마리를 덜 골랐을 때와 같은 :disabled 스타일)
    // 상대가 나가면 같은 자리에 끊김 안내를 보여주고 두 버튼 모두 비활성화(잠시 뒤 시작화면으로)
    dexBattleDecideBtn.textContent = mpPickerDisconnected ? '상대와의 통신이 끊어졌습니다'
        : mpPartyLocked ? '대기 중' : '선택 완료';
    dexBattleDecideBtn.disabled = mpPartyLocked || battleParty.length < 3;
    dexBattleRandomBtn.disabled = mpPartyLocked;
    // 끊김 안내 문구가 길어 랜덤 선택과 한 줄에 안 들어가므로(버튼 줄 폭 초과) 그동안만 랜덤 선택을 숨김
    dexBattleRandomBtn.classList.toggle('hidden', mpPickerDisconnected);
    markDexFormGridPartyCells();
}

// battleParty에 있는 폼과 일치하는 .dex-form-cell에 .in-party 체크 배지를 표시함. 폼 칸을
// 클릭하는 것 자체가 슬롯 등록/해제를 겸하다 보니(별도 추가/빼기 버튼 없음) 지금 슬롯에 뭐가
// 들어있는지 그리드에서 바로 보여줄 유일한 시각적 피드백 — 그리드를 새로 그릴 때(renderDexFormGrid)
// 와 party가 바뀔 때(renderBattleSlots)마다 호출해 항상 최신 상태로 유지함
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

    // 선택 모드에서는 "잡음" 체크박스+카운트 줄을 항상 숨기고(#dex-box.picker-mode #dex-core가
    // 그만큼 높이를 줄여서 슬롯 바에 공간을 내줌), 목록 화면일 때 showDexList()가 다시 보이게
    // 하는 걸 여기서 덮어씀 — 일반 도감 모드에서는 dexPickerMode가 false라 전혀 개입 안 함.
    // 좌측 상단 ⚙ 설정 버튼도 같은 방식으로 숨김 — 선택 도중 도감 초기화/치트로 포획 상태가 바뀌면
    // 이미 슬롯에 넣은 포켓몬과 어긋나므로, 선택 모드에서는 설정 화면으로 가는 입구 자체를 없앰
    dexBoxEl.classList.toggle('picker-mode', dexPickerMode);
    if (dexPickerMode) {
        dexCountBarEl.classList.add('hidden');
        dexSettingsBtn.classList.add('hidden');
    }
}

// "무작위" 버튼 — 잡은 적 있는(isFormColored/isFormShinyColored 기준, 치트 코드로 잡은 것도
// 포함) 폼 전체를 후보로 무작위 3마리(모자라면 있는 만큼)를 뽑아 파티를 통째로 새로 채움. 계속
// 눌러서 다시 뽑을 수 있어야 하므로 "빈 슬롯만 채우기"가 아니라 매번 battleParty 전체를 교체함.
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
        mpPartyLocked = true;
        renderBattleSlots();
        updateDexPickerBarVisibility();
        mpSend('party', battleParty.map(p => ({ id: p.id, isShiny: !!p.isShiny })));
        // 개인 타이머는 openBattlePartyPicker()에서 화면 진입 시점부터 이미 돌고 있음 —
        // 여기서 새로 시작하지 않고 그대로 이어서 씀(선택 완료로 리셋 안 함)
        mpWaitFor('party', (oppParty) => {
            if (!mp.active || !mpPartyLocked) return;
            window.mpClearDeadlineTimer();
            beginBattle(mpSanitizeParty(oppParty));
        });
        return;
    }

    // AI 파티 구성은 아직 확정하지 않아서(추후 능력치가 생기면 종족치 기준으로 정하기로 함) 지금은
    // 기존 야생 등장 로직을 그대로 재사용한 pickAiTeam()으로 임시 채움
    beginBattle(pickAiTeam());
});

// 3v3 배틀 시작 — 내 파티/상대 파티 둘 다 hp를 채우고 기절 상태를 초기화함. opponentParty는 AI
// 배틀이면 pickAiTeam(), 함께하기면 상대가 보낸 파티({id, isShiny, hp, fainted, known})
function beginBattle(opponentParty) {
    battleMode = mp.active ? 'pvp' : 'ai';
    mpPartyLocked = false;
    mpTurn = 0;
    mpMissStreak = 0;
    mpSelfPassStreak = 0;
    mpAwaitingOpponentAction = false;
    mpMyLoadSent = false;
    window.mpClearDeadlineTimer();
    battleParty.forEach(p => { p.hp = BATTLE_MON_MAX_HP; p.fainted = false; });
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

    // 선택 모드 종료 — 슬롯 애니메이션만 정리하고(battleParty 자체는 "포켓몬" 버튼으로 교체할
    // 수 있어야 하니 배틀이 끝날 때까지 그대로 유지 — battlePreviewCloseBtn에서 비움) 도감
    // 모달을 닫음
    dexPickerMode = false;
    battleSlotController.stopAll();
    dexModal.classList.add('hidden');

    battlePreviewActive = true;
    startScreen.classList.add('hidden');

    // 배틀 시작 시 메인 메뉴(싸운다/포켓몬) 버튼은 곧바로 뜨지 않고, 교체 때와 동일한 순서로
    // "상대가 ~ 내보냈다!" → 상대 등장 → "가랏! ~!" → 내 포켓몬 등장 연출이 끝난 뒤에만
    // 나타나도록 함(아래 두 등장 연출이 끝나는 지점 참고).
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
    monsterInfoText.style.left = 'calc(50% + 40px + (var(--info-width) * 0.8 / 2))';
    monsterInfoText.style.transform = 'translateX(-100%)';
    monsterInfoText.style.top = `${WILD_INFO_TOP - WILD_INFO_GAP - WILD_INFO_TEXT_ROW_CORRECTION}px`;
    monsterInfoText.style.bottom = 'auto';
    monsterInfo.style.left = 'calc(50% + 40px)';
    monsterInfo.style.top = `${WILD_INFO_TOP - WILD_INFO_GAP + WILD_INFO_NAME_BLOCK_HEIGHT}px`;

    // hp바 디자인은 배틀 프리뷰에서만 overlay_hp_back/overlay_hp로 교체
    monsterInfo.classList.add('battle-hp-style');
    monsterHpFillEl.classList.remove('hidden');

    battlePreviewScreen.classList.remove('hidden');

    // 함께하기는 등장 연출 전에 이번 배틀 스프라이트를 전부 받아두고, 양쪽 다 받을 때까지 기다림
    if (battleMode === 'pvp') {
        showBattleWaiting('불러오는 중...');
        window.mpStartDeadline(battleTurnTimerEl, MP_LOADED_TIMEOUT_MS, () => {
            // 신호를 이미 보내서(mpMyLoadSent) 상대 신호를 기다리는 중이면 네트워크 여유를
            // 주고, 아직 내 로딩 자체가 안 끝난 거면 여유 없이 곧바로 끊김 처리
            if (mpMyLoadSent) { window.mpGraceThenDisconnect(); return; }
            window.mpForceDisconnect();
        });
        mpPreloadBattleAssets().then(battleCallback(() => {
            mpMyLoadSent = true;
            mpSend('loaded');
            mpWaitFor('loaded', battleCallback(() => {
                window.mpClearDeadlineTimer();
                playBattleIntro();
            }));
        }));
        return;
    }
    playBattleIntro();
}

// 상대(AI) 트레이너의 첫 포켓몬 등장 — 무작위가 아니라 aiParty[0]을 지정해서 보여주되,
// 배틀 중 교체할 때 쓰는 switchAiToIndex()를 그대로 재사용해서 "상대가 ~ 내보냈다!" 메시지가
// 먼저 뜨고 그 다음에 포켓몬이 나타나도록 함(교체 연출과 완전히 동일)
function playBattleIntro() {
    switchAiToIndex(0, () => {
        // 이어서 내 포켓몬 등장 — "가랏! ~!" 멘트 후 applyPlayerSwitch()로 뒷모습을 페이드인시킴
        // (applyPlayerSwitch가 뒷모습/이름/타입/hp바까지 전부 알아서 채워줌)
        const playerInfo = POKEMON_DATA[selectedBattleId] || { name: '???' };
        showBattleMessage(`가랏! ${playerInfo.name}!`, () => {
            applyPlayerSwitch(0, () => {
                battleMessageBoxEl.classList.add('hidden');
                battleMessageBoxEl.textContent = '';
                battleMainMenuEl.classList.remove('hidden');
                startMyActionDeadline();
            });
        });
    });
}

// 배틀 프리뷰(승패 결과 화면 포함)를 완전히 접고 시작화면으로 복귀 — ×(닫기) 버튼과 결과 화면의
// "처음으로" 버튼 둘 다 여기로 옴
// ===================== 상태 확인 오버레이 =====================
// 액션박스의 "상태 확인" 버튼 — 턴을 쓰지 않는 정보 전용 화면. 내/상대 파티 3칸씩 보여주고,
// 선택한 포켓몬 입장의 순수 상성(getBaseTypeMultiplier)을 반대편 포켓몬 이름 옆 아이콘으로 표기함
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

// 순수 상성(baseMult) → 공격 버튼 아래 6단계 효과 미리보기 { icon, text }. 아이콘은 matchupIconClass와
// 완전히 같은 judgment.png 3종(good/bad/none)을 재사용하고, 텍스트 경계는 실제 공격 후 뜨는
// 데미지 멘트(afterDamage의 effMessage, 1095행 부근)와 동일하게 맞춤 — 다만 여긴 "~했다" 과거형이
// 아니라 상태를 미리 보여주는 명사형 라벨
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
const STATUS_UNKNOWN_SPRITE_SRC = 'images/pokemon/layout/random.png';
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

// 빨간 칸(.active)은 내/상대 어느 칸이든 하나만 선택할 수 있고(처음엔 내 전장 포켓몬), 선택한 포켓몬이
// 반대편 파티 3마리를 각각 공격할 때의 상성을 반대편 이름 옆 아이콘으로 보여줌(보통은 아이콘 없음).
// 상대 전장 포켓몬은 따로 강조하지 않음
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
    // 함께하기면 연결은 그대로 두고(다시하기 재대결용) 지난 배틀의 남은 메시지만 비움
    if (battleMode === 'pvp') mpClearInbox();
    battleMode = 'ai';
    mpTurn = 0;
    mpPartyLocked = false;
    mpRematchWaiting = false;
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
    // 기절 연출(playAiFaintAnimation) 도중 닫혔을 수도 있으니 #monster-sprite에 남아있을 수 있는
    // transition과, #monster에 임시로 그어둔 땅 라인(clip-path)을 정리 —
    // transform은 다음 몬스터가 뜰 때 displayMonsterSprite()가 다시 설정해줌
    const monsterSpriteEl = monster.querySelector('#monster-sprite');
    if (monsterSpriteEl) monsterSpriteEl.style.transition = '';
    monster.style.clipPath = '';
    // alignWildMonsterTopToHpBar()가 인라인으로 덮어쓴 위치를 원래(CSS 기본값)로 복원
    monster.style.top = '';
    monsterInfo.classList.add('hidden');
    // 배틀 프리뷰 전용 hp바 디자인(overlay_hp_back/overlay_hp)을 원래(hp_bar.png)로 복원 —
    // 그대로 두면 다음에 실제 포획 게임을 시작할 때도 이 디자인이 남아있게 됨
    monsterInfo.classList.remove('battle-hp-style');
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
function leaveBattleToHome() {
    if (battleMode === 'pvp' && mp.active) mpLeave();
    resetBattlePreview();
}
battlePreviewCloseBtn.addEventListener('click', leaveBattleToHome);
battleResultHomeBtn.addEventListener('click', leaveBattleToHome);
// 포획 게임의 "다시하기"(startGame, 시작화면 건너뛰고 바로 재시작)와 동일한 취지 —
// 배틀을 완전히 정리한 뒤 곧바로 파티 선택 화면으로 다시 진입시킴
// 함께하기는 선택 완료와 같은 규칙 — 누르면 "대기 중"(회색 비활성화)으로 바뀌고, 상대도 다시하기를
// 누르면 그때 둘 다 선택창으로 이동함(상대가 먼저 눌러뒀으면 mpWaitFor가 즉시 불려 곧바로 이동)
battleResultRetryBtn.addEventListener('click', () => {
    if (battleMode === 'pvp') {
        if (!mp.active || mpRematchWaiting) return;
        mpRematchWaiting = true;
        battleResultRetryBtn.textContent = '대기 중';
        battleResultRetryBtn.disabled = true;
        mpSend('rematch');
        mpWaitFor('rematch', battleCallback(() => {
            resetBattlePreview();
            openBattlePartyPicker();
        }));
        return;
    }
    resetBattlePreview();
    openBattlePartyPicker();
});
// "포켓몬 배틀" 버튼 — 전용 목록 대신 도감(#dex-modal)을 선택 모드로 염
// "포켓몬 배틀" 버튼과 배틀 결과 화면의 "다시하기" 버튼이 공유하는 로직으로 분리 —
// 다시하기는 시작화면으로 돌아가지 않고 곧바로 파티 선택 화면부터 다시 시작함
function openBattlePartyPicker() {
    dexPickerMode = true;
    battleParty = [];
    mpPartyLocked = false;
    mpPickerDisconnected = false;
    openDexModal(); // 검색창 초기화 + 목록 화면부터 시작 + 모달 표시(기존 도감 진입 로직 그대로)
    renderBattleSlots(); // 슬롯 3칸을 빈 상태로 되돌리고 결정 버튼도 같이 초기화
    updateDexPickerBarVisibility();
    // 화면에 들어오는 이 순간부터 개인 제한시간 시작 — 도감을 보며 고르는 시간과 고른 뒤
    // 상대를 기다리는 시간을 하나로 이어서 셈(선택 완료를 눌러도 리셋되지 않음)
    if (mp.active) {
        window.mpStartDeadline(dexWaitTimerEl, MP_PARTY_TIMEOUT_MS, () => {
            // 선택 완료를 이미 눌러서(mpPartyLocked) 상대 파티를 기다리는 중이면 네트워크
            // 여유를 주고, 아직 고르지도 못한 거면(내 로컬 얘기) 여유 없이 곧바로 끊김 처리
            if (mpPartyLocked) { window.mpGraceThenDisconnect(); return; }
            window.mpForceDisconnect();
        });
    }
}

// "포켓몬 배틀" → 혼자하기/함께하기 하위 메뉴(pokemon_multiplayer.js의 showStartSubmenu)
battleBtn.addEventListener('click', () => showStartSubmenu('mode'));

