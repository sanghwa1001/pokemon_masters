// ===================== pokemon_pokedex.js (포켓몬 도감) =====================
// 폼 표시용 데이터 테이블은 pokemon_pokedex_form_data.js 참고. registerDexCatch()는
// pokemon_catch.js가, openDexModal()/dexPickerMode는 pokemon_battle.js가 가져다 쓰므로
// 이 파일이 두 파일보다 먼저 로드되어야 함(구조는 MODULARIZATION_PLAN.md 참고).

const dexBtn            = document.getElementById('dex-btn');
const dexModal          = document.getElementById('dex-modal');
const dexBoxEl          = document.getElementById('dex-box');
const dexBackBtn        = document.getElementById('dex-back-btn');
const dexSettingsBtn    = document.getElementById('dex-settings-btn');
const dexCloseBtn       = document.getElementById('dex-close-btn');
const dexSearchInputEl  = document.getElementById('dex-search-input');
const dexOwnedOnlyCheckbox = document.getElementById('dex-owned-only-checkbox');
const dexCountBarEl     = document.getElementById('dex-count-bar');
const dexListEl         = document.getElementById('dex-list');

// 배틀 선택 모드(dexPickerMode) 전용 요소 — #dex-modal이 "포켓몬 배틀" 버튼으로 열렸을 때만 씀
const dexSettingsEl        = document.getElementById('dex-settings');
const dexResetBtn          = document.getElementById('dex-reset-btn');
const dexResetPageEl       = document.getElementById('dex-reset-page');
const dexResetInputEl      = document.getElementById('dex-reset-input');
const dexResetApplyBtn     = document.getElementById('dex-reset-apply-btn');
const dexResetFeedbackEl   = document.getElementById('dex-reset-feedback');
const dexCaughtCountEl  = document.getElementById('dex-caught-count');
const dexTotalCountEl   = document.getElementById('dex-total-count');
const dexCheatBtn         = document.getElementById('dex-cheat-btn');
const dexCheatPageEl       = document.getElementById('dex-cheat-page');
const dexCheatInputEl      = document.getElementById('dex-cheat-input');
const dexCheatApplyBtn     = document.getElementById('dex-cheat-apply-btn');
const dexCheatFeedbackEl   = document.getElementById('dex-cheat-feedback');

// 포켓몬 정보 화면(도감 목록 → 항목 클릭 시 전환되는 화면. 포획 여부와 무관하게 열림) 요소
const dexInfoEl         = document.getElementById('dex-info');
const dexInfoSpriteBox  = document.getElementById('dex-info-sprite-box');
const dexInfoSpriteEl   = document.getElementById('dex-info-sprite');
const dexInfoNumEl      = document.getElementById('dex-info-num');
const dexInfoNameEl     = document.getElementById('dex-info-name');
const dexInfoFormGridEl = document.getElementById('dex-info-form-grid');

// 엑셀 업로드로 채워지는 단어 목록: [{ en: '영어단어', kr: '한글뜻' }, ...]
function dexRepresentativeId(species) {
    const forms = NORMAL_BY_SPECIES[species] || [];
    return forms.includes(species) ? species : forms[0];
}

// ===================== 포켓몬 도감 (Firebase 연동) =====================
const DEX_STORAGE_KEY       = 'pokemonCatchGame_ownedDex_v1';       // 포획한 species id 목록
const DEX_FORMS_STORAGE_KEY = 'pokemonCatchGame_ownedDexForms_v1';  // 포획한 적 있는 개별 폼(POKEMON_DATA id) 목록
const DEX_SHINY_FORMS_STORAGE_KEY = 'pokemonCatchGame_ownedDexShinyForms_v1';

let ownedDexSpecies = new Set();
let ownedDexForms = new Set();
let ownedDexShinyForms = new Set();

// 도감 저장 형식: students/{uid}/pokedex/{species|forms|shinyForms}/{id} = true (키 단위).
// 예전엔 배열 전체를 매번 덮어써서, 탭 두 개나 기기 두 대로 동시에 잡으면 나중에 저장한 쪽이
// 이겨 포획 기록이 사라졌음 — 이제는 새로 잡은 항목 하나만 추가로 씀
//
// 불러올 때는 세 가지 모양을 다 읽음: ① 예전 배열 형식(["6","25"]), ② 새 형식 객체({"6":true}),
// ③ 새 형식인데 키가 촘촘한 숫자라 RTDB가 배열로 돌려준 경우([null, true, ...] — 인덱스가 id)
function readDexIdSet(data) {
    if (!data) return { ids: [], legacy: false };
    const entries = Array.isArray(data) ? data.map((v, i) => [String(i), v]) : Object.entries(data);
    const present = entries.filter(([, v]) => v !== null && v !== undefined);
    if (present.length && present.every(([, v]) => v === true)) {
        return { ids: present.map(([k]) => k), legacy: false };
    }
    return { ids: present.map(([, v]) => String(v)), legacy: present.length > 0 };
}

// Firebase에서 도감 데이터를 불러와서 메모리에 적용 — 예전 배열 형식이면 한 번 새 형식으로 옮겨 저장
window.loadPokedexFromFirebase = function(pokedexData) {
    const species = readDexIdSet(pokedexData.species);
    const forms = readDexIdSet(pokedexData.forms);
    const shinyForms = readDexIdSet(pokedexData.shinyForms);
    ownedDexSpecies = new Set(species.ids);
    ownedDexForms = new Set(forms.ids);
    ownedDexShinyForms = new Set(shinyForms.ids);
    // 치트 코드 상태도 도감 데이터와 같은 계정 경로(students/{uid}/pokedex)에서 불러와서,
    // 어떤 기기로 로그인해도 이전에 켜둔 치트 상태가 그대로 유지됨(기기별 localStorage가 아님)
    dexCheatDexAll = !!pokedexData.cheatDexAll;
    dexCheatCaughtAll = !!pokedexData.cheatCaughtAll;

    if (species.legacy || forms.legacy || shinyForms.legacy) {
        const toMap = (set) => {
            const m = {};
            set.forEach(id => { m[id] = true; });
            return Object.keys(m).length ? m : null;
        };
        writeDexToFirebase({
            species: toMap(ownedDexSpecies),
            forms: toMap(ownedDexForms),
            shinyForms: toMap(ownedDexShinyForms)
        });
    }
};

// 로그아웃 시 메모리 도감 비우기
window.resetPokedexLocal = function() {
    ownedDexSpecies = new Set();
    ownedDexForms = new Set();
    ownedDexShinyForms = new Set();
    dexCheatDexAll = false;
    dexCheatCaughtAll = false;
};

function dexFirebaseRef() {
    if (!window.currentStudentId || !window.firebaseDb) return null;
    return window.firebaseRef(window.firebaseDb, `students/${window.currentStudentId}/pokedex`);
}

// 도감 경로 아래 여러 칸을 한 번에 갱신(update) — 로그인 전이면 아무것도 안 함
function writeDexToFirebase(changes) {
    const ref = dexFirebaseRef();
    if (!ref || !window.firebaseUpdate) return;
    window.firebaseUpdate(ref, changes).catch(e => console.error("Firebase 도감 저장 실패", e));
}

// ===================== 도감 치트 코드 (설정 화면에서 입력) =====================
// 실제 포획 데이터(ownedDex*)는 절대 건드리지 않고, 화면 표시 로직에서만 우회하는 방식으로
// 구현함 — 그래야 "도감 초기화"를 누르면 치트 흔적 없이 완전히 원래 상태로 돌아갈 수 있음.
//   DexAll    : 모든 종/폼이 "언락"(이름 공개) 상태가 되지만, 실제로 잡지 않은 건 흑백(grayed)으로 표시
//   CaughtAll : 모든 종/폼이 실제로 잡은 것처럼 컬러(owned)로 표시
// 치트 코드 상태(DexAll/CaughtAll)는 기기별 localStorage가 아니라 도감 데이터와 같은
// 계정 경로(students/{uid}/pokedex)에 저장됨 — loadPokedexFromFirebase/writeDexToFirebase 참고.
// 로그인 전에는 도감 화면 자체에 진입할 수 없으므로 기본값은 항상 false로 시작함
let dexCheatDexAll    = false;
let dexCheatCaughtAll = false;

// 종/폼 단위로 "언락 여부"(이름 공개)와 "컬러 표시 여부"(실제로 잡은 것처럼 보임)를 계산하는
// 헬퍼. 도감 목록/정보/폼 그리드 렌더링이 전부 이 함수들을 통해서만 ownedDex* Set을 조회하므로,
// 치트가 꺼져 있으면 지금까지의 동작과 완전히 동일함
function isSpeciesUnlocked(species) {
    return dexCheatDexAll || dexCheatCaughtAll || ownedDexSpecies.has(species);
}
function isSpeciesColored(species) {
    return dexCheatCaughtAll || ownedDexSpecies.has(species);
}
function isFormUnlocked(id) {
    return dexCheatDexAll || dexCheatCaughtAll || ownedDexForms.has(id);
}
function isFormColored(id) {
    return dexCheatCaughtAll || ownedDexForms.has(id);
}
// 폼별 "색이 다른" 칸 전용 — 정확히 그 폼(id)을 이로치로 잡아본 적 있는지로 판정
function isFormShinyUnlocked(id) {
    return dexCheatDexAll || dexCheatCaughtAll || ownedDexShinyForms.has(id);
}
function isFormShinyColored(id) {
    return dexCheatCaughtAll || ownedDexShinyForms.has(id);
}

// 포획 성공 시 호출 — 몬스터의 species(메가/거다이맥스도 기본형 species로 귀속)를 도감에 등록하고,
// 동시에 정확히 잡은 폼(monsterId 그 자체)도 별도로 기록함
function registerDexCatch(monsterId, isShiny) {
    const info = POKEMON_DATA[monsterId];
    const species = info && info.species;
    if (!species || !NORMAL_BY_SPECIES[species]) return; // 알 수 없는 species는 안전하게 무시

    const changes = {};
    if (!ownedDexSpecies.has(species)) {
        ownedDexSpecies.add(species);
        changes[`species/${species}`] = true;
    }
    if (!isShiny && !ownedDexForms.has(monsterId)) {
        ownedDexForms.add(monsterId);
        changes[`forms/${monsterId}`] = true;
    }
    if (isShiny && !ownedDexShinyForms.has(monsterId)) {
        ownedDexShinyForms.add(monsterId);
        changes[`shinyForms/${monsterId}`] = true;
    }
    if (Object.keys(changes).length) writeDexToFirebase(changes);
}

// 도감 헤더 검색창 상태: 빈 문자열이면 전체 표시. 숫자만 입력하면 도감번호(3자리, 0패딩)
// 부분일치, 그 외 문자는 "포획한 종의 이름"에만 부분일치(미포획 종은 이름이 '???'라 검색으로
// 노출되면 안 되므로 잠긴 종은 이름 검색 대상에서 항상 제외함)
let dexSearchQuery = '';

// "포획한 포켓몬만 보기" 체크박스 상태 — true면 검색어와 별개로 미포획 종을 목록에서 아예 제외함
let dexOwnedOnly = false;

function matchesDexSearch(species) {
    const q = dexSearchQuery.trim();
    if (!q) return true;

    if (/^\d+$/.test(q)) {
        return String(species).padStart(3, '0').includes(q);
    }

    if (!isSpeciesUnlocked(species)) return false; // 언락되지 않은 종은 이름으로 검색되지 않음
    const repId = dexRepresentativeId(species);
    const info = POKEMON_DATA[repId] || { name: '' };
    return info.name.toLowerCase().includes(q.toLowerCase());
}

// 도감 목록 렌더링: species 번호 순으로 검색어/"포획한 것만 보기" 조건에 맞는 항목만 나열하고,
// 포획한 적 있는 종만 이름/아이콘 공개, 나머지는 실루엣(검은 그림자) 처리. 상단 카운트는
// 필터와 무관하게 항상 전체 기준(포획수/전체종수)으로 표시함
function renderDexList() {
    dexTotalCountEl.textContent = String(DEX_SPECIES_ORDER.length);
    dexCaughtCountEl.textContent = String(DEX_SPECIES_ORDER.filter(isSpeciesColored).length);

    dexListEl.innerHTML = '';

    // 배틀 선택 모드(dexPickerMode)에서는 "잡음" 체크박스 상태와 무관하게 항상 잡은 종만 보임
    // (어차피 못 잡은 건 슬롯에 등록할 수 없으므로)
    const visibleSpecies = DEX_SPECIES_ORDER.filter(species =>
        matchesDexSearch(species) && (!(dexOwnedOnly || dexPickerMode) || isSpeciesColored(species))
    );

    if (DEX_SPECIES_ORDER.length === 0) {
        const empty = document.createElement('div');
        empty.id = 'dex-empty';
        empty.textContent = '도감 데이터가 없습니다';
        dexListEl.appendChild(empty);
        return;
    }

    if (visibleSpecies.length === 0) {
        const empty = document.createElement('div');
        empty.id = 'dex-empty';
        // 잡은 포켓몬만 보는 중(잡음/선택 모드)인데 잡은 종이 하나도 없으면 검색·필터 탓이 아니므로 문구를 나눔
        const noneCaught = (dexOwnedOnly || dexPickerMode) && !DEX_SPECIES_ORDER.some(isSpeciesColored);
        empty.textContent = noneCaught ? '잡은 포켓몬이 없습니다' : '검색 결과가 없습니다';
        dexListEl.appendChild(empty);
        return;
    }

    visibleSpecies.forEach(species => {
        const unlocked = isSpeciesUnlocked(species);
        const colored = isSpeciesColored(species);
        const repId = dexRepresentativeId(species);
        const info = POKEMON_DATA[repId] || { name: '???' };

        const row = document.createElement('div');
        row.className = unlocked ? 'dex-row' : 'dex-row locked';
        row.dataset.species = species; // 클릭 시 어떤 종을 눌렀는지 식별하는 용도

        const num = document.createElement('div');
        num.className = 'dex-num';
        num.textContent = `No.${String(species).padStart(3, '0')}`;

        // 미언락 종은 아이콘 이미지를 검은 실루엣(그림자)으로, 언락됐지만 실제로 안 잡은 종은
        // (치트 DexAll) 흑백(grayscale)으로, 실제로(또는 치트 CaughtAll로) 잡은 종은 원래 색으로 표시
        const icon = document.createElement('div');
        icon.className = colored ? 'dex-icon' : (unlocked ? 'dex-icon grayed' : 'dex-icon locked');
        icon.style.backgroundImage = `url(${capturedIconSrc(repId, 'normal', false)})`;

        const name = document.createElement('span');
        name.className = 'dex-name';
        name.textContent = unlocked ? info.name : '???';

        row.appendChild(num);
        row.appendChild(icon);
        row.appendChild(name);

        if (colored) {
            const badge = document.createElement('div');
            badge.className = 'dex-owned-badge';
            row.appendChild(badge);
        }

        dexListEl.appendChild(row);
    });
}

// 도감 목록에서는 포획 여부와 무관하게 항목을 누르면 정보 화면으로 전환됨(미포획 종도 "???" +
// 실루엣으로나마 조회 가능하게 함)
dexListEl.addEventListener('click', (e) => {
    const row = e.target.closest('.dex-row');
    if (!row) return;
    openDexInfo(row.dataset.species);
});

// ===================== 포켓몬 정보 화면 (도감 목록 ↔ 정보 화면 전환) =====================

let dexInfoSpriteAnimTimerId = null; // 메인 게임의 몬스터 애니메이션 타이머와는 별개로 관리
function stopDexInfoSpriteAnimation() {
    if (dexInfoSpriteAnimTimerId !== null) {
        clearInterval(dexInfoSpriteAnimTimerId);
        dexInfoSpriteAnimTimerId = null;
    }
}

// 지금 정보 화면에서 큰 스프라이트 카드에 표시 중인 정확한 폼 id. 대표폼으로 시작하지만,
// 아래 폼 그리드에서 다른 칸을 누르면 그 폼으로 바뀜(showDexInfoForm 참고). "색이 다른"(이로치)
// 가상 칸을 눌렀을 때는 실제 POKEMON_DATA에 없는 합성 id("<대표폼id>::shiny")가 여기 들어감
let dexInfoCurrentSpecies = null;
let dexInfoSelectedFormId = null;

// 폼 그리드 칸의 id는 실제 POKEMON_DATA id이거나, "<폼id>::shiny" 형태의 가상 칸(그 폼을 이로치
// 색상으로 보여줌, 폼마다 1개씩)일 수 있음. "::"는 실제 id에 나오지 않는 구분자라 안전하게 씀 —
// 이 헬퍼로 항상 "실제 id"와 "이로치 여부" 두 값으로 분리함.
const DEX_SHINY_CELL_SUFFIX = '::shiny';
function parseDexCellId(cellId) {
    if (cellId.endsWith(DEX_SHINY_CELL_SUFFIX)) {
        return { realId: cellId.slice(0, -DEX_SHINY_CELL_SUFFIX.length), isShiny: true };
    }
    return { realId: cellId, isShiny: false };
}

// displayMonsterSprite()와 동일한 방식(정사각형 프레임을 잘라 background-position으로 재생)을
// 정보 화면 전용 박스(#dex-info-sprite-box, 140px 기준)에 맞게 재사용. id의 실제 카테고리
// (normal/mega/gmax)에 맞는 스프라이트 폴더를 반드시 찾아서 재생해야 함(normal/front로 고정하면
// 메가/거다이맥스 폼에서 잘못된 이미지가 나옴). cellId는 실제 폼 id이거나 가상 칸 id
// (parseDexCellId 참고) — 둘 다 이 함수 하나로 처리하며, SPRITE_SIZE_REF_SPECIES_NORMAL/_SHINY
// 정지 이미지 크기 보정도 반드시 함께 적용해야 함(빠지면 716/791-1/792-1/802-1 등이 다른
// 포켓몬보다 크게 보이는 버그가 재발함).
function renderDexInfoSprite(cellId) {
    stopDexInfoSpriteAnimation();
    const { realId: id, isShiny } = parseDexCellId(cellId);
    const src = frontSpriteSrc(id, isShiny);

    dexInfoSpriteEl.style.backgroundRepeat = 'no-repeat';
    dexInfoSpriteEl.style.backgroundPosition = '0 0';
    dexInfoSpriteEl.style.backgroundImage = `url("${src}")`;

    const probe = new Image();
    probe.onload = () => {
        if (dexInfoSelectedFormId !== cellId) return; // 로딩 중 다른 폼/이로치 상태로 바뀌었으면 무시(경쟁 방지)

        // 정보 화면 전용 박스는 항상 140px 정사각형 기준 — 메인 게임과 동일한 SPRITE_REFERENCE_SIZE
        // 비율로 종족 간 상대적 크기감을 유지함(정지 이미지 크기 보정 포함, computeFrontSpriteLayout 참고)
        const boxWidth = dexInfoSpriteBox.clientWidth || 140;
        const layout = computeFrontSpriteLayout(id, isShiny, probe.naturalWidth, probe.naturalHeight, boxWidth);
        applyFrontSpriteLayout(dexInfoSpriteEl, layout);
        dexInfoSpriteAnimTimerId = startFilmstrip(dexInfoSpriteEl, layout.displaySize, layout.frameCount);
    };
    probe.src = src;
}






function dexFormShortLabel(id, species, repId) {
    if (DEX_FORM_NAME_OVERRIDES[id]) return DEX_FORM_NAME_OVERRIDES[id];
    if (id === repId) return '기본';

    const suffix = id.slice(String(species).length + 1); // species 뒤 "-" 다음 부분
    if (DEX_FORM_SUFFIX_LABELS[suffix]) return DEX_FORM_SUFFIX_LABELS[suffix];

    const numFemaleMatch = suffix.match(/^(\d+)_female$/);
    if (numFemaleMatch) return `폼 ${numFemaleMatch[1]} (암컷)`;

    if (/^\d+$/.test(suffix)) return `폼 ${suffix}`;

    return suffix || '기본'; // 알 수 없는 접미사 패턴에 대한 안전장치
}



// 폼 id를 숫자/비숫자 조각으로 나눠 비교하는 자연 정렬. 문자열 그대로 비교하면 "1017-10"이
// "1017-2"보다 앞에 와버리는(사전식 비교라 '1'<'2') 문제가 있어서, 숫자 조각은 반드시 수치로
// 비교해야 "100" -> "100-1" -> "100-2" -> ... -> "100-10" 순서가 파일명 감각과 일치함
function naturalIdCompare(a, b) {
    const re = /(\d+)|(\D+)/g;
    const aParts = a.match(re) || [];
    const bParts = b.match(re) || [];
    const len = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < len; i++) {
        const ap = aParts[i], bp = bParts[i];
        if (ap === undefined) return -1;
        if (bp === undefined) return 1;
        if (ap === bp) continue;
        if (/^\d+$/.test(ap) && /^\d+$/.test(bp)) {
            const diff = Number(ap) - Number(bp);
            if (diff !== 0) return diff;
        } else {
            return ap < bp ? -1 : 1;
        }
    }
    return 0;
}


// 이 species의 모든 폼(대표폼+리전/성별/코스튬/그림자+메가+거다이맥스)을 그리며, 각 폼 바로 뒤에
// 전용 이로치 가상 칸을 하나씩 끼워 1:1로 짝지음. 칸은 정지 아이콘만 쓰고(애니메이션은 큰 카드
// 전용), 실제로 잡은 폼/이로치는 컬러(ownedDexForms/ownedDexShinyForms 기준)로, 못 잡은 건
// 실루엣으로 표시함. 정렬은 DEX_FORM_CATEGORY→DEX_FORM_BUCKET_ORDER 범주 안에서 폼 id 순서로
// 배열한 뒤(DEX_FORM_SORT_OVERRIDE 있으면 그 값 우선) 각 폼 뒤에 이로치 짝을 삽입하는 방식.
// 이름표는 DEX_FORM_LABEL_FORCED_SPLIT에 등록된 폼만 의미 조각 경계까지 <br> 강제 줄바꿈하고
// 나머지는 word-break:keep-all에 맡김. 칸 클릭은 dexInfoFormGridEl 위임 리스너 한 곳에서 처리.
function renderDexFormGrid(species, repId) {
    dexInfoFormGridEl.innerHTML = '';

    const formIds = Object.keys(POKEMON_DATA).filter(id => POKEMON_DATA[id].species === species);

    // 폼이 있는 한(항상 최소 1개) 그리드를 숨길 일이 없음
    dexInfoFormGridEl.classList.remove('hidden');

    const sortedFormIds = formIds
        .map(id => ({ id, bucket: DEX_FORM_CATEGORY[id] || '기타' }))
        .sort((a, b) => {
            const orderDiff = DEX_FORM_BUCKET_ORDER.indexOf(a.bucket) - DEX_FORM_BUCKET_ORDER.indexOf(b.bucket);
            if (orderDiff !== 0) return orderDiff;
            const aOverride = DEX_FORM_SORT_OVERRIDE[a.id], bOverride = DEX_FORM_SORT_OVERRIDE[b.id];
            if (aOverride !== undefined && bOverride !== undefined) return aOverride - bOverride;
            return naturalIdCompare(a.id, b.id);
        })
        .map(({ id }) => id);

    // 정렬된 실제 폼 순서 그대로, 각 폼 바로 뒤에 그 폼의 이로치 칸을 붙여서 1:1로 짝지음
    const cells = [];
    sortedFormIds.forEach((id) => {
        cells.push({ id, isShinyCell: false, realFormId: id });
        cells.push({ id: `${id}${DEX_SHINY_CELL_SUFFIX}`, isShinyCell: true, realFormId: id });
    });

    cells.forEach(({ id, isShinyCell, realFormId }) => {
        const formInfo = POKEMON_DATA[realFormId];
        const unlocked = isShinyCell ? isFormShinyUnlocked(realFormId) : isFormUnlocked(realFormId);
        const colored  = isShinyCell ? isFormShinyColored(realFormId)  : isFormColored(realFormId);

        // 배틀 선택 모드에서는 못 잡은 폼은 슬롯에 등록할 수 없으니 그리드에 아예 안 보여줌
        // (registerDexCatch가 종을 등록할 때 항상 정확한 폼도 같이 등록하므로, 목록에 뜨는
        // 종은 그리드에 최소 1칸은 항상 남음 — 빈 그리드가 되는 경우 없음)
        if (dexPickerMode && !colored) return;

        const cell = document.createElement('div');
        cell.className = 'dex-form-cell';
        cell.dataset.formId = id;

        const iconBox = document.createElement('div');
        iconBox.className = 'dex-form-sprite-box';
        const iconEl = document.createElement('div');
        iconEl.className = colored ? 'dex-form-icon' : (unlocked ? 'dex-form-icon grayed' : 'dex-form-icon locked');
        iconEl.style.backgroundImage = `url(${capturedIconSrc(realFormId, formInfo.category, isShinyCell)})`;
        iconBox.appendChild(iconEl);
        cell.appendChild(iconBox);

        // 좌측 상단 폼 아이콘 — 배틀 슬롯과 같은 공통 로직(setBattleSlotFormIcon)으로 판단하고, 못 잡은
        // 칸(회색·잠김)은 category를 넘기지 않아 숨김
        const formIcon = document.createElement('span');
        formIcon.className = 'battle-slot-form-icon hidden';
        cell.appendChild(formIcon);
        setBattleSlotFormIcon(cell, colored ? formInfo.category : null);

        const label = document.createElement('div');
        label.className = unlocked ? 'dex-form-name' : 'dex-form-name locked';
        if (unlocked) {
            // DEX_FORM_LABEL_FORCED_SPLIT에 있는 폼은 그 조각들로, 없으면 라벨 전체를 한 조각으로
            // 취급. 이로치 칸은 "색이 다른"을 마지막 조각으로 추가함 — 조각 사이만 <br>로 강제
            // 줄바꿈하고, 조각 내부는 기존처럼 word-break:keep-all 자동 줄바꿈에 맡김.
            const segments = (DEX_FORM_LABEL_FORCED_SPLIT[realFormId] || [dexFormShortLabel(realFormId, species, repId)]).slice();
            if (isShinyCell) segments.push('색이 다른');
            segments.forEach((seg, i) => {
                if (i > 0) label.appendChild(document.createElement('br'));
                label.appendChild(document.createTextNode(seg));
            });
        } else {
            label.textContent = '???';
        }
        cell.appendChild(label);

        dexInfoFormGridEl.appendChild(cell);
    });

    markDexFormGridPartyCells(); // 그리드를 새로 그릴 때마다 지금 배틀 슬롯에 있는 폼 표시를 반영
}

// 폼 그리드 칸 클릭 → 큰 카드를 그 폼으로 전환(이벤트 위임 리스너 하나만 유지). 배틀 선택 모드
// (dexPickerMode)에서는 같은 클릭이 슬롯 등록/해제도 겸함(다시 누르면 빠짐) — 못 잡은 폼은
// 미리보기만 되고 슬롯엔 등록되지 않음.
dexInfoFormGridEl.addEventListener('click', (e) => {
    const cell = e.target.closest('.dex-form-cell');
    if (!cell) return;
    showDexInfoForm(cell.dataset.formId);

    // 함께하기에서 "선택 완료"를 누른 뒤(상대 대기 중)엔 파티가 잠겨서 미리보기만 됨
    if (!dexPickerMode || mpPartyLocked) return;
    const { realId, isShiny } = parseDexCellId(cell.dataset.formId);
    const colored = isShiny ? isFormShinyColored(realId) : isFormColored(realId);
    if (!colored) return;

    const idx = battleParty.findIndex(p => p.id === realId && p.isShiny === isShiny);
    if (idx !== -1) {
        battleParty.splice(idx, 1);
    } else {
        if (battleParty.length >= 3) return;
        battleParty.push({ id: realId, isShiny });
    }
    renderBattleSlots();
});

// 큰 스프라이트 카드+이름을 특정 폼 그리드 칸(cellFormId) 기준으로 채움 — 대표폼, 다른 폼
// (리전/성별/코스튬/그림자/메가/거다이맥스), 가상 이로치 칸까지 전부 이 함수 하나로 처리함
// (parseDexCellId로 실제 id/이로치 여부를 분리). 정확히 그 폼을 잡았는지(ownedDexForms,
// 이로치는 ownedDexShinyForms, 둘 다 폼 단위 판정)에 따라 컬러 애니메이션 또는 실루엣으로 표시.
// 이름 텍스트는 선택한 폼과 무관하게 항상 그 종의 대표폼 이름(=도감 이름)으로 고정함(예: 메가
// 리자몽X를 선택해도 "리자몽"으로 표시, 스프라이트만 바뀜) — "-female" 폼 전용 ♀ 표시는 이
// 고정 방침 때문에 쓰지 않음. 그리드 안 현재 선택 칸도 함께 강조 표시함.
function showDexInfoForm(cellFormId) {
    dexInfoSelectedFormId = cellFormId;
    const { realId, isShiny } = parseDexCellId(cellFormId);
    const formInfo = POKEMON_DATA[realId] || { name: '???' };
    const unlocked = isShiny ? isFormShinyUnlocked(realId) : isFormUnlocked(realId);
    const colored  = isShiny ? isFormShinyColored(realId)  : isFormColored(realId);
    // 이름은 도감 목록과 동일하게 "종 단위" 잠금해제 기준을 씀 — 어떤 폼을 선택하든 이름 텍스트
    // 자체는 항상 같은 종 이름이라, 폼 단위로 가릴 실익이 없고 목록 화면과 기준이 어긋나는 걸 방지함
    const nameUnlocked = isSpeciesUnlocked(dexInfoCurrentSpecies);

    const repId = formInfo.species ? dexRepresentativeId(formInfo.species) : realId;
    const repInfo = POKEMON_DATA[repId] || formInfo;
    dexInfoNameEl.textContent = nameUnlocked ? repInfo.name : '???';
    dexInfoSpriteEl.classList.toggle('locked', !unlocked);
    dexInfoSpriteEl.classList.toggle('grayed', unlocked && !colored);
    renderDexInfoSprite(cellFormId);

    dexInfoFormGridEl.querySelectorAll('.dex-form-cell').forEach(cell => {
        cell.classList.toggle('selected', cell.dataset.formId === cellFormId);
    });
}

// species를 받아 정보 화면을 채우고 목록 대신 표시함(미포획 종은 이름/스프라이트가 "???"·실루엣으로
// 나옴). 도감번호/이름은 species 단위로 고정 표시하고(nameUnlocked 참고), 스프라이트만 showDexInfoForm이
// 처리하는 폼 단위 정보라 대표폼부터 시작해 폼 그리드 선택에 따라 바뀜. 이로치 여부는 별도 배지
// 없이 폼 그리드의 컬러/실루엣 구분만으로 표시함.
function openDexInfo(species) {
    const repId = dexRepresentativeId(species);

    dexInfoCurrentSpecies = species;
    dexInfoNumEl.textContent = `No.${String(species).padStart(3, '0')}`;

    renderDexFormGrid(species, repId);

    // 선택 모드에서는 대표폼 자체는 못 잡았고 다른 폼만 잡았을 수 있음(그리드엔 잡은 폼만
    // 보임) — 그리드에 실제로 그려진 첫 칸을 초기 미리보기로 써서 "???"/실루엣으로 시작하지
    // 않게 함(대표폼이 잡혀있으면 어차피 그 칸이 첫 칸이라 결과는 같음)
    const firstOwnedCell = dexPickerMode ? dexInfoFormGridEl.querySelector('.dex-form-cell') : null;
    showDexInfoForm(firstOwnedCell ? firstOwnedCell.dataset.formId : repId); // 처음 열 때는 항상 대표폼부터 보여줌

    dexSettingsEl.classList.add('hidden');
    dexListEl.classList.add('hidden');
    dexInfoEl.classList.remove('hidden');

    // 좌측 상단 자리: 정보 화면에서는 뒤로가기, 설정 버튼은 숨김(목록 화면 전용)
    dexBackBtn.classList.remove('hidden');
    dexSettingsBtn.classList.add('hidden');

    // 검색창/체크박스/포획 수 표시는 목록 화면 전용이라 정보 화면에서는 숨김 (도감번호/이름은
    // 헤더에 따로 안 두고, 이제 본문의 큰 스프라이트 카드 바로 위에 표시됨 — dexInfoNumEl/dexInfoNameEl 참고)
    dexSearchInputEl.classList.add('hidden');
    dexCountBarEl.classList.add('hidden');

    updateDexPickerBarVisibility();
}

// 정보/설정/초기화/치트 화면 → 목록 화면으로 복귀 (좌측 상단은 뒤로가기 → 설정 버튼으로, 헤더는
// 검색창+포획 수 표시가 다시 보이도록 복귀)
function showDexList() {
    stopDexInfoSpriteAnimation();
    dexInfoEl.classList.add('hidden');
    dexSettingsEl.classList.add('hidden');
    dexResetPageEl.classList.add('hidden');
    dexCheatPageEl.classList.add('hidden');
    dexListEl.classList.remove('hidden');

    dexBackBtn.classList.add('hidden');
    dexSettingsBtn.classList.remove('hidden');

    dexSearchInputEl.classList.remove('hidden');
    dexCountBarEl.classList.remove('hidden');

    updateDexPickerBarVisibility();
}

// 좌측 상단 ⚙ 버튼을 누르면 목록 대신 설정 화면으로 전환 (뒤로가기 버튼을 눌러 목록으로 복귀).
// 설정 화면 자체는 이제 "도감 초기화"/"치트 코드" 버튼 두 개만 있는 목록이고, 각 버튼을 누르면
// showDexResetPage/showDexCheatPage로 완전히 별도 화면 전환됨(토글 패널 아님)
function showDexSettings() {
    stopDexInfoSpriteAnimation();
    dexListEl.classList.add('hidden');
    dexInfoEl.classList.add('hidden');
    dexResetPageEl.classList.add('hidden');
    dexCheatPageEl.classList.add('hidden');
    dexSettingsEl.classList.remove('hidden');

    dexBackBtn.classList.remove('hidden');
    dexSettingsBtn.classList.add('hidden');

    // 설정 화면도 검색창/체크박스/포획 수 표시는 필요 없으니 숨김
    dexSearchInputEl.classList.add('hidden');
    dexCountBarEl.classList.add('hidden');

    updateDexPickerBarVisibility();
}

// 설정 화면에서 "도감 초기화"를 누르면 전환되는 전용 페이지. 열 때마다 입력창/피드백을 비움
// (뒤로가기를 눌러 설정 화면으로 돌아가는 것이 사실상 "취소" — 별도 취소 버튼 없음)
function showDexResetPage() {
    stopDexInfoSpriteAnimation();
    dexListEl.classList.add('hidden');
    dexInfoEl.classList.add('hidden');
    dexSettingsEl.classList.add('hidden');
    dexCheatPageEl.classList.add('hidden');
    dexResetPageEl.classList.remove('hidden');

    dexResetInputEl.value = '';
    dexResetFeedbackEl.textContent = '';
    dexResetFeedbackEl.className = '';
    dexResetInputEl.focus();

    dexBackBtn.classList.remove('hidden');
    dexSettingsBtn.classList.add('hidden');
    dexSearchInputEl.classList.add('hidden');
    dexCountBarEl.classList.add('hidden');

    updateDexPickerBarVisibility();
}

// 설정 화면에서 "치트 코드"를 누르면 전환되는 전용 페이지. 열 때마다 입력창/피드백을 비움
function showDexCheatPage() {
    stopDexInfoSpriteAnimation();
    dexListEl.classList.add('hidden');
    dexInfoEl.classList.add('hidden');
    dexSettingsEl.classList.add('hidden');
    dexResetPageEl.classList.add('hidden');
    dexCheatPageEl.classList.remove('hidden');

    dexCheatInputEl.value = '';
    dexCheatFeedbackEl.textContent = '';
    dexCheatFeedbackEl.className = '';
    dexCheatInputEl.focus();

    dexBackBtn.classList.remove('hidden');
    dexSettingsBtn.classList.add('hidden');
    dexSearchInputEl.classList.add('hidden');
    dexCountBarEl.classList.add('hidden');

    updateDexPickerBarVisibility();
}

// 도감 데이터(species/폼/폼별 이로치 3종 세트)와 치트 코드 상태까지 전부 지우고 목록을
// 빈 상태로 다시 그림 — 치트 흔적 없이 완전히 처음 상태로 되돌리는 게 목적이라 dexCheat* 플래그도 함께 끔
function resetDexData() {
    ownedDexSpecies = new Set();
    ownedDexForms = new Set();
    ownedDexShinyForms = new Set();
    dexCheatDexAll = false;
    dexCheatCaughtAll = false;
    writeDexToFirebase({ species: null, forms: null, shinyForms: null, cheatDexAll: false, cheatCaughtAll: false });

    renderDexList(); // 화면 전환은 하지 않고 목록 데이터만 배경에서 최신화(치트 코드 적용 방식과 동일)
}

// 뒤로가기 버튼: 도감 초기화/치트 코드 전용 페이지에서는 설정 화면으로, 그 외(정보 화면 등)는
// 목록 화면으로 복귀. 별도 상태 변수 대신 현재 어느 화면이 보이는지 DOM에서 직접 확인해서
// 판단하므로 화면 전환 로직과 상태가 어긋날 일이 없음
dexBackBtn.addEventListener('click', () => {
    if (!dexResetPageEl.classList.contains('hidden') || !dexCheatPageEl.classList.contains('hidden')) {
        showDexSettings();
    } else {
        showDexList();
    }
});
dexSettingsBtn.addEventListener('click', showDexSettings);

// 도감 초기화 버튼: 전용 페이지로 이동
dexResetBtn.addEventListener('click', showDexResetPage);

// 되돌릴 수 없는 파괴적 동작이라, 정확히 이 코드를 입력해야만 실제로 초기화됨(실수 클릭 방지용
// 안전장치 — 치트 코드(DexAll/CaughtAll)와 동일한 방식으로, 정확한 코드(대소문자 구분) 일치로
// 판정. 코드가 틀리면 에러 피드백만 보여주고 아무 것도 지우지 않음
const DEX_RESET_CONFIRM_CODE = 'DeleteAll';

function applyDexReset() {
    const typed = dexResetInputEl.value.trim();
    if (!typed) return; // 빈 입력은 조용히 무시(치트 코드 입력과 동일한 패턴)

    if (typed === DEX_RESET_CONFIRM_CODE) {
        resetDexData(); // 화면 전환은 하지 않음(치트 코드 적용과 동일하게 같은 페이지에 머무름)
        dexResetInputEl.value = ''; // 치트 코드 입력창과 동일하게 성공 시 입력값 비움
        dexResetFeedbackEl.textContent = '도감이 초기화되었습니다';
        dexResetFeedbackEl.className = 'success';
    } else {
        dexResetFeedbackEl.textContent = '알 수 없는 코드입니다';
        dexResetFeedbackEl.className = 'error';
    }
}

dexResetApplyBtn.addEventListener('click', applyDexReset);
dexResetInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyDexReset();
});

// 치트 코드 버튼: 전용 페이지로 이동
dexCheatBtn.addEventListener('click', showDexCheatPage);

// 입력된 치트 코드를 검사해 적용함. 대소문자를 정확히 구분해서 비교하므로(예: "DexAll"만
// 인정, "dexall"/"DEXALL"은 불인정) trim만 하고 대소문자는 그대로 둠. 실제 포획 데이터
// (ownedDex*)는 절대 바꾸지 않고 화면 표시용 플래그만 켬 — 그래서 저장해두면 다음에 도감을
// 열어도 그대로 유지되지만, 도감 초기화를 누르면 함께 꺼짐
function applyDexCheatCode() {
    const code = dexCheatInputEl.value.trim();

    if (code === 'DexAll') {
        dexCheatDexAll = true;
        writeDexToFirebase({ cheatDexAll: true });
        dexCheatFeedbackEl.textContent = '도감이 공개되었습니다';
        dexCheatFeedbackEl.className = 'success';
    } else if (code === 'CaughtAll') {
        dexCheatCaughtAll = true;
        writeDexToFirebase({ cheatCaughtAll: true });
        dexCheatFeedbackEl.textContent = '도감이 완성되었습니다';
        dexCheatFeedbackEl.className = 'success';
    } else if (code) {
        dexCheatFeedbackEl.textContent = '알 수 없는 코드입니다';
        dexCheatFeedbackEl.className = 'error';
        return;
    } else {
        return; // 빈 입력은 조용히 무시
    }

    dexCheatInputEl.value = '';
    renderDexList();

    // 정보 화면을 보던 중이었다면(치트를 정보 화면에서 켠 경우) 표시도 바로 갱신
    if (!dexInfoEl.classList.contains('hidden') && dexInfoCurrentSpecies) {
        renderDexFormGrid(dexInfoCurrentSpecies, dexRepresentativeId(dexInfoCurrentSpecies));
        showDexInfoForm(dexInfoSelectedFormId || dexRepresentativeId(dexInfoCurrentSpecies));
    }
}

dexCheatApplyBtn.addEventListener('click', applyDexCheatCode);
dexCheatInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyDexCheatCode();
});

// 도감 모달을 목록 화면부터 새로 여는 공용 진입점 — 시작화면의 dex-btn과 결과화면의
// dex-btn-result 양쪽에서 동일하게 사용함. 열 때마다 검색어를 초기화해서 매번 전체 목록부터 보임
function openDexModal() {
    dexSearchQuery = '';
    dexSearchInputEl.value = '';
    dexOwnedOnly = false;
    if (dexOwnedOnlyCheckbox) dexOwnedOnlyCheckbox.checked = false;
    showDexList(); // 도감을 열 때는 항상 목록 화면부터 시작
    renderDexList();
    dexModal.classList.remove('hidden');
}

// "포켓몬 도감" 버튼(시작화면/결과화면)은 항상 일반 브라우징 모드로 염 — 혹시 배틀 선택 모드가
// 켜진 채로 남아있어도(정상 흐름에서는 그럴 일 없지만 방어적으로) 여기서 확실히 끔
function openDexModalNormal() {
    dexPickerMode = false;
    openDexModal();
    updateDexPickerBarVisibility();
}
dexBtn.addEventListener('click', openDexModalNormal);
if (dexOwnedOnlyCheckbox) {
    dexOwnedOnlyCheckbox.addEventListener('change', () => {
        dexOwnedOnly = dexOwnedOnlyCheckbox.checked;
        renderDexList();
    });
}

dexCloseBtn.addEventListener('click', () => {
    stopDexInfoSpriteAnimation();
    dexModal.classList.add('hidden');
    // 배틀 선택 모드 도중 닫은 거라면 취소로 취급 — 골라둔 슬롯도 함께 비움
    if (dexPickerMode) {
        dexPickerMode = false;
        battleParty = [];
        mpPartyLocked = false;
        mpPickerEndText = null;
        dexBattleRandomBtn.classList.remove('hidden');
        battleSlotController.stopAll();
        // 함께하기 선택창을 닫으면 방을 나간 것으로 처리(상대는 끊김 알림을 봄), 혼자하기는 선택 제한시간만 정리
        if (mp.active) mpLeave();
        else window.mpClearDeadlineTimer();
        window.mpClearSignalFreeze(); // 종료 안내 중에 ×로 닫았으면 고정해 둔 신호 아이콘도 숨김
    }
});

// 검색창 입력: 입력할 때마다 검색어를 갱신하고 목록을 다시 그림. 정보 화면을 보고 있는 도중에
// 검색어를 입력하면(뒤로가기 없이 헤더 검색창을 바로 눌러 입력하는 경우) 자동으로 필터링된
// 목록 화면으로 돌아가서 결과를 바로 확인할 수 있게 함
dexSearchInputEl.addEventListener('input', () => {
    dexSearchQuery = dexSearchInputEl.value;
    if (!dexInfoEl.classList.contains('hidden')) {
        showDexList();
    }
    renderDexList();
});

