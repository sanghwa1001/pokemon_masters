# 포켓몬 게임 코드 모듈화(script.js 분리) 계획 (v2, 실행 완료)

> **2026-09-12 실행 완료.** 아래 계획대로 분리 작업을 마쳤고, 전체 결과를 로드 순서대로 이어붙여
> `node --check`까지 통과시켜 검증함. 남은 건 사용자가 브라우저에서 새로고침 후 포획/도감/배틀/퀴즈
> 핵심 흐름을 직접 확인하는 것뿐임. 실행 중 실제로 발견된 세부 차이는 각 절 끝의 "실행 결과" 메모 참고.
> 작성일: 2026-09-12 (v2: script.js를 완전히 없애지 않고 "공용 계층"으로 남기는 방향으로 재설계)

## 1. 배경 및 목적

- `script.js`가 5,747줄(252KB)까지 커져서, 도감/포획/배틀/퀴즈 로직이 한 파일에 뒤섞여 있어 특정 기능 코드를 찾고 수정하기 어려워짐.
- 기능별(포켓몬 도감 / 포켓몬 포획 / 포켓몬 배틀 / 학습·퀴즈)로 파일을 분리해서 유지보수성을 높이는 것이 목표.
- **v1 → v2 변경점**: 처음엔 script.js를 4개 파일로 완전히 쪼개서 없앨 계획이었으나, "완전히 범용적인 부분(2개 이상 도메인에서 실제로 쓰이는 코드)은 script.js에 그대로 남기고, 나머지만 도메인별 파일로 뺀다"는 방향으로 재조정함. script.js는 사라지지 않고 **가장 먼저 로드되는 공용 계층**으로 축소됨(5,747줄 → 약 500줄).
- 또한 "배틀에서도 기술/교체 버튼을 누를 때 학습데이터 퀴즈를 재사용할 계획"이라는 사용자의 향후 방향을 반영해, 퀴즈·엑셀업로드 로직을 포획 게임에서 떼어내 별도 파일(`pokemon_learning.js`)로 분리함.
- 데이터(고정된 값 테이블)와 로직(동작 코드)도 분리해서, "데이터 파일은 `_data`로 끝난다"는 명명 규칙을 전체에 일관되게 적용.

## 2. 제약 조건

- **실행 환경**: `index.html`을 더블클릭해서 `file://`로 직접 여는 구조. 서버를 띄우지 않음.
  - → ES 모듈(`type="module"`, `import`/`export`)은 `file://`에서 브라우저가 차단하므로 사용 불가.
  - → 기존과 동일하게 여러 개의 `<script src="...">` 태그를 순서대로 로드하는 방식(전역 스코프 공유)으로 분리해야 함.
- **버전 관리 없음**: git 등 형상관리 시스템이 전혀 없고, `CHANGELOG.md` 텍스트 기록이 유일한 히스토리.
  - → 안전장치로 작업 전 폴더 전체를 백업함: **`pokemon_catch_game10_backup_20260912`**(같은 `mnt` 폴더 안, 155MB, 이미지 포함 전체 복사본). 문제 발생 시 이 백업으로 되돌릴 수 있음.
- **테스트 방법의 한계**: `file://` 페이지라 Claude가 직접 화면을 보고 검증할 방법이 없음. 문법 오류는 `node --check`로 매 단계 확인하지만, 실제 동작(포획/도감/배틀/퀴즈가 예전처럼 되는지)은 사용자가 새로고침해서 직접 확인해야 함.
- **섹션 주석은 100% 신뢰 불가**: script.js 안의 `// ===== 섹션명 =====` 주석은 실제 코드 경계와 정확히 안 맞는 곳이 있음을 이번 조사에서 확인함(예: "4지선다 퀴즈" 섹션 끝부분에 포획 게임 함수(`startGame`, `renderCapturedList`)가 섞여 있었고, "스프라이트시트 애니메이션" 섹션 안에 포획 전용 함수(`initGame`, `runCapture`, `onCaptureSuccess` 등)가 섞여 있었음). → 아래 표는 섹션 주석이 아니라 **함수 단위로 실제 호출 관계(grep)를 확인**해서 만든 것이며, 실행 시에도 이 함수 경계를 기준으로 자름.

## 3. 최종 파일 구조

### 3.1 전체 스크립트 파일 목록 (기존 5개 → 최종 10개)

| # | 파일명 | 성격 | 상태 | 줄수(추정) |
|---|---|---|---|---|
| 1 | `pokemon_data.js` | 데이터 | 그대로 유지 | 1,610줄 |
| 2 | `pokemon_battle_data.js` | 데이터 | 그대로 유지 | 36줄 |
| 3 | `pokemon_front_sprite_offsets_data.js` | 데이터 | 이름 변경 (구 `pokemon_sprite_offsets.js`) | 1,602줄 |
| 4 | `pokemon_back_sprite_offsets_data.js` | 데이터 | 이름 변경 (구 `pokemon_back_sprite_offsets.js`) | 3,202줄 |
| 5 | `pokemon_pokedex_form_data.js` | 데이터 | **신규** (script.js에서 분리) | 2,139줄 |
| 6 | `script.js` | 로직(공용) | **대폭 축소해서 유지** | 약 500줄 (5,747→500) |
| 7 | `pokemon_learning.js` | 로직 | **신규** (엑셀 업로드 + 퀴즈) | 약 150줄 |
| 8 | `pokemon_pokedex.js` | 로직 | **신규** | 약 760줄 |
| 9 | `pokemon_catch.js` | 로직 | **신규** | 약 730줄 |
| 10 | `pokemon_battle.js` | 로직 | **신규** | 약 1,510줄 |

- **명명 규칙**: 함수/이벤트리스너 없이 순수 객체·배열만 있는 파일 → `_data`로 끝남. 실제 동작 로직이 있는 파일 → 도메인 이름만 사용.
- `script.js`는 "도메인 이름"이 아니라 여러 도메인이 공유하는 기반 계층이라는 의미로 이름을 그대로 유지함.

### 3.2 index.html `<script>` 최종 로드 순서

```html
<script src="pokemon_data.js"></script>
<script src="pokemon_battle_data.js"></script>
<script src="pokemon_front_sprite_offsets_data.js"></script>
<script src="pokemon_back_sprite_offsets_data.js"></script>
<script src="pokemon_pokedex_form_data.js"></script>
<script src="script.js"></script>
<script src="pokemon_learning.js"></script>
<script src="pokemon_pokedex.js"></script>
<script src="pokemon_catch.js"></script>
<script src="pokemon_battle.js"></script>
```

순서가 중요한 이유(전역 스코프 공유 방식이라 반드시 지켜야 함):

- 데이터 파일들은 그걸 참조하는 로직 파일보다 항상 먼저 로드되어야 함.
- `script.js`(공용)는 다른 모든 로직 파일이 기대는 기반이므로 로직 파일 중 가장 먼저 로드됨.
- `pokemon_learning.js`는 다른 도메인에 의존하지 않지만, `pokemon_catch.js`가 "충전하기" 버튼에서 이 파일의 함수를 호출하므로 catch.js보다 먼저 옴.
- `pokemon_pokedex.js`가 `pokemon_pokedex_form_data.js`의 데이터를 참조하므로 그 뒤에 옴.
- `pokemon_catch.js`의 `onCaptureSuccess()`가 `pokemon_pokedex.js`의 `registerDexCatch()`를 직접 호출하므로 pokedex.js보다 뒤에 옴.
- `pokemon_battle.js`는 `pokemon_catch.js`의 `initGame()`(배틀 프리뷰용 재사용)과 `pokemon_pokedex.js`의 `openDexModal()`/`dexPickerMode`(배틀 파티 선택 화면)를 그대로 가져다 쓰므로 **가장 마지막**에 옴.

## 4. `script.js` (공용 계층) 상세 내용 — 약 500줄

**포함 기준**: 2개 이상의 도메인(포획/배틀/도감)에서 실제로 호출되는 것이 코드로 확인된 것만. "이름이 범용적으로 들린다"는 이유만으로는 포함하지 않음(예: `alignWildMonsterTopToHpBar`, `backSpriteInfo`류는 이름과 달리 실제로는 배틀에서만 쓰여서 제외 — 7절 참고).

| 함수/상수 | 원본 줄 | 실제 사용처 (호출부 확인됨) |
|---|---|---|
| 반응형 스케일링 전체 | 26–192 | 게임 전체 레이아웃(도감 모달 포함) — 도메인 자체가 없음 |
| `#monster`, `#monster-info`, `#monster-info-text`, `#shiny-effect` 등 공용 DOM 상수 | 1–25 | 포획(야생 몬스터 표시) + 배틀(상대 AI 포켓몬 표시, 57~61 패치로 동일 요소 재사용 확인됨) |
| `formatCpTotal()` | 3136 | 포획 결과창(3210), 포획 몬스터 정보(3765) + 도감 폼그리드 CP 표시(4428) |
| `preloadImage()` | 3356 | 포획(다음 야생 몬스터 미리 로드) + 배틀(`switchAiToIndex`의 상대 교체 시 미리 로드) |
| 스프라이트 표시 엔진: `stopSpriteAnimation()`, `SPRITE_REFERENCE_SIZE`, `SPRITE_SIZE_REF_SPECIES_NORMAL/SHINY`, `displayMonsterSprite()` | 3374–3531 | 포획(`initGame`) + 배틀(`switchAiToIndex`) 양쪽에서 몬스터 앞모습 표시에 사용 |
| `TYPE_ICON_ORDER`/`TYPE_ICON_INDEX`/`TYPE_BADGE_HEIGHT`, `renderTypeBadges()` | 3725–3744 | 포획(야생 몬스터 타입 뱃지) + 배틀(내 포켓몬 타입 뱃지, `battleBackTypesEl`) |
| `updateMonsterInfo()` | 3745 | 포획(`initGame`) + 배틀(`switchAiToIndex`)에서 이름/타입/HP바 갱신에 공통 사용 |
| 샤이니 이펙트: `stopShinyAnimation()`, `playShinyEffect()` | 3780–3843 | 포획 + 배틀 양쪽에서 `isShiny`일 때 재생 |
| `typeMessage()` | 4020 | 포획(포획 성공 메시지) + 배틀(`showBattleMessage`) 양쪽의 타이핑 효과 |

## 5. `pokemon_learning.js` 상세 내용 — 약 150줄 (원본 4190–4333줄)

| 원본 줄 범위 | 내용 |
|---|---|
| 4190–4228 | 학습 데이터 업로드(엑셀: A열 영어 / B열 한글뜻) → `wordList` 채움 |
| 4229–4333 | 4지선다 퀴즈 엔진 — `shuffleArray`, `pickQuizQuestion`, `fitOptionButtonText`, `renderQuiz`, 정답/오답 판정 |

**설계 변경 포인트**: 원래 `handleQuizAnswer()`는 정답이면 `pokeballCount++`/`runawayCount++`(포획 게임 전용 보상)를 직접 실행하는 구조였음. 이걸 그대로 옮기면 `pokemon_learning.js`가 포획 게임 변수에 역방향으로 의존하게 되어, 나중에 배틀에서 같은 퀴즈를 "기술 성공/실패" 판정으로 재사용하기 어려움.

→ 그래서 정답/오답 판정 로직은 `pokemon_learning.js`에 남기되, "맞았을 때/틀렸을 때 무엇을 할지"는 **콜백으로 받도록** 함수 시그니처를 조정함(예: `pickQuizQuestion(onCorrect, onWrong)` 형태). `pokemon_catch.js`는 "몬스터볼/도망치다 +1·-1" 콜백을 넘기고, 나중에 `pokemon_battle.js`가 실제로 퀴즈를 붙일 때는 "기술 실행/실패" 콜백만 새로 짜서 넘기면 됨 — `pokemon_learning.js` 자체는 그때 가서 수정할 필요가 없음.

충전 버튼(`chargeBtn`) 클릭 시 퀴즈를 열고 이어가는 로직(원본 4335–4349 부근)은 포획 화면의 버튼이므로 `pokemon_catch.js`에 남기고, 거기서 `pokemon_learning.js`가 노출하는 함수만 호출하는 얇은 wiring으로 처리함.

## 6. `pokemon_pokedex_form_data.js` 상세 내용 — 2,139줄

script.js의 "포켓몬 정보 화면" 섹션 안에 있던, 순수 데이터 테이블 5종. 전부 "폼 ID → 도감 화면 표시값" 매핑이며 게임 로직(포획/배틀 계산)에는 쓰이지 않고 도감 UI 렌더링에서만 참조됨.

| 테이블명 | 줄수 | 용도 |
|---|---|---|
| `DEX_FORM_CATEGORY` | 1,625줄 | 폼 ID마다 "기본/암컷/알로라/가라르/히스이/팔데아/기타/메가/거다이맥스" 9개 분류 중 어디 속하는지 지정 — 도감 폼 그리드 정렬용 |
| `DEX_FORM_NAME_OVERRIDES` | 443줄 | "폼 3"처럼 번호로만 표시되던 걸 "알로라"/"지우 하나캡" 등 실제 이름으로 바꿔주는 표 |
| `DEX_FORM_LABEL_FORCED_SPLIT` | 49줄 | 폼 이름이 길 때 어디서 강제 줄바꿈할지 지정 |
| `DEX_FORM_SUFFIX_LABELS` | 18줄 | mega/gmax/female 같은 접미사를 한글 라벨로 매핑 |
| `DEX_FORM_SORT_OVERRIDE` | 4줄 | 정렬 순서 예외 처리(우라오스 메가 등 특수 케이스) |

## 7. `pokemon_pokedex.js` 상세 내용 — 약 760줄 (원본 223–3120줄 중 데이터 테이블 제외)

원본 223–264줄(전국도감 저장, `registerDexCatch` 포함), 265–425줄(치트 코드), 426–3120줄(정보화면 로직, 6절의 데이터 테이블 제외) 포함.

포함되는 주요 함수: `registerDexCatch`, `loadOwnedDex`/`saveOwnedDex`, `matchesDexSearch`, `stopDexInfoSpriteAnimation`, `parseDexCellId`, `renderDexInfoSprite`, `dexFormShortLabel`, `naturalIdCompare`, `renderDexFormGrid`, `showDexInfoForm`, `openDexInfo`, `showDexList`, `showDexSettings`, `showDexResetPage`, `showDexCheatPage`, `resetDexData`, `applyDexReset`, `applyDexCheatCode`, `openDexModal`, `openDexModalNormal` 등.

### 7.1 다른 파일과 얽히는 지점

- `registerDexCatch()`: `pokemon_catch.js`의 `onCaptureSuccess()`가 포획 성공 시 직접 호출 → **catch.js가 pokedex.js보다 뒤에 로드되어야 하는 이유**.
- `dexPickerMode` 변수: 선언은 pokedex.js에 있고, 도감 목록 렌더링 함수들이 내부에서 이 값을 체크해서 "배틀 파티 선택 모드"일 때 필터링을 다르게 함. `pokemon_battle.js`는 선언 없이 값만 바꿔가며 사용.
- `openDexModal()`: pokedex.js에 정의됨. battle.js의 파티 선택 진입 로직(`openBattlePartyPicker()`)이 그대로 호출함.

→ **`pokemon_pokedex.js`는 `pokemon_catch.js`와 `pokemon_battle.js` 둘 다보다 먼저 로드되어야 함.**

## 8. `pokemon_catch.js` 상세 내용 — 약 730줄

| 원본 줄 범위 | 내용 |
|---|---|
| 193–222 | 9세대 확장: 카테고리 기반 등장/포획 시스템 |
| 3121–3355 (일부) | 타이머(`formatTime`/`startGameTimer`/`onTimeUp` 등)·CP합계·결과화면(`finishGameToResult`/`showResultScreen`)·포획 확률(`getCatchProbability`/`pickFailType`)·랜덤 몬스터 선택(`pickRandomMonster`/`pickCategory`)·아이콘 경로(`capturedIconSrc`) — `formatCpTotal`/`preloadImage`(→script.js)와 `backSpriteInfo`류(→battle.js)는 제외 |
| 3844–4189 | 포획 연출 전체: `resetPokeball`, `refreshButtons`, `initGame`, `escapeMonster`/`openAndEscape`, `runCapture`, `shakeN`, `onCaptureSuccess`, `reenableButtons`, `runThrow`, `runRunAway` |
| 4335–4448 (일부) | `startGame()`(게임 시작 공통 로직), `renderCapturedList()`(포획 목록 화면) — 5절에서 뺀 나머지 |
| 5717–5735 | 게임 중 타이머 클릭 → 일시정지 화면 |
| 5736–5747 | 게임 중 점수 클릭 → 포획한 포켓몬 화면 |
| — | `chargeBtn` 클릭 시 `pokemon_learning.js`의 퀴즈 함수를 호출하는 wiring(6절 참고) |

### 8.1 이 파일이 의존하는 것 (로드 순서 근거)

- `script.js`: `displayMonsterSprite`, `typeMessage`, `updateMonsterInfo`, `playShinyEffect`, `formatCpTotal`, `preloadImage`, `renderTypeBadges`
- `pokemon_pokedex.js`: `registerDexCatch()`
- `pokemon_learning.js`: 퀴즈 열기/이어가기 함수

## 9. `pokemon_battle.js` 상세 내용 — 약 1,510줄

| 원본 줄 범위 | 내용 |
|---|---|
| 3284–3313 | 배틀용 뒷모습 스프라이트 경로 계산: `BACK_FOLDER`, `backSpriteInfo`, `baseBackSpriteInfo` (이름과 달리 배틀 전용 — 캐치 게임엔 뒷모습 표시가 없음) |
| 3532–3724 | 배틀용 뒷모습 스프라이트 표시 엔진: `stopBackSpriteAnimation`, `playBackShinyEffect`/`stopBackShinyAnimation`, `BACK_SPRITE_SIZE_REF_SPECIES_NORMAL/SHINY`, `displayBackSprite` |
| 4449–4468 | `alignWildMonsterTopToHpBar()` — 이름은 "Wild"지만 실제로는 `battlePreviewActive`를 체크해서 배틀 프리뷰에서만 동작(포획 게임 자체 흐름에서는 호출 안 됨) |
| 4470–4620 | 3v3 AI 트레이너 배틀 엔진(진입점, AI 행동 결정 등) |
| 4621–4700 | hp바 표시/애니메이션(상대·나 공통 패턴) |
| 4701–4767 | 기절 연출 |
| 4768–4798 | 대화창(액션박스 ⇄ 메시지) |
| 4799–4834 | 공격하기 메뉴(물리/특수/랭크업/회복) |
| 4835–5199 | 턴 진행 |
| 5200–5283 | 배틀 중 포켓몬 교체 |
| 5284–5716 | 포켓몬 배틀 선택(도감을 "선택 모드"로 재사용, 파티 피커) |

### 9.1 이 파일이 의존하는 것 (로드 순서 근거)

- `script.js`: `displayMonsterSprite`, `typeMessage`, `updateMonsterInfo`, `renderTypeBadges`, `preloadImage`, 샤이니 이펙트
- `pokemon_pokedex.js`: `openDexModal()`, `dexPickerMode`
- `pokemon_catch.js`: `initGame()`(배틀 프리뷰가 몬스터 미리보기에 재사용)

## 10. 실행 순서 (안전한 것부터, 위험한 것 나중에)

| 단계 | 작업 | 리스크 |
|---|---|---|
| 0 | (완료) 폴더 전체 백업 — `pokemon_catch_game10_backup_20260912` | - |
| 1 | `pokemon_sprite_offsets.js` → `pokemon_front_sprite_offsets_data.js`, `pokemon_back_sprite_offsets.js` → `pokemon_back_sprite_offsets_data.js` 이름 변경(내용 무변경). index.html 스크립트 경로 갱신 | 매우 낮음 |
| 2 | `pokemon_pokedex_form_data.js` 분리(데이터 테이블 5종 이동) | 낮음(순수 데이터, 로직 없음) |
| 3 | `script.js` 슬림화: 4절 표의 공용 함수/DOM만 남기고, 나머지를 아래 4~6단계 파일로 이동 시작 | 중간 (도메인 함수를 잘못 남기거나 잘못 빼면 참조 오류) |
| 4 | `pokemon_learning.js` 분리(엑셀 업로드 + 퀴즈, 콜백 구조로 조정) | 중간 (`handleQuizAnswer` 콜백화가 유일한 실제 로직 변경 지점) |
| 5 | `pokemon_pokedex.js` 분리 | 중간 |
| 6 | `pokemon_catch.js` 분리 | 중간 (8.1절 의존 관계 순서 주의) |
| 7 | `pokemon_battle.js` 분리 | 가장 높음(다른 3개 파일 함수를 제일 많이 재사용) |
| 8 | index.html `<script>` 태그 최종 정리(3.2절 순서대로) | - |
| 9 | `CHANGELOG.md`에 리팩터링 내역 기록(버전 번호 "1.1"은 유지, 범위 주석만 확장) | - |

각 단계마다:
1. `node --check <파일>`으로 문법 오류 확인 (Claude가 수행)
2. 사용자가 `index.html` 새로고침 → 포획/도감/배틀/퀴즈 핵심 동작이 예전과 동일한지 확인
3. 문제 없으면 다음 단계로, 문제 있으면 백업으로 복원 후 원인 파악

## 11. 요약 체크리스트 (전부 완료)

- [x] 1단계: 오프셋 파일 이름 변경 + index.html 갱신 (기존 `pokemon_sprite_offsets.js`/`pokemon_back_sprite_offsets.js`는 원본 그대로 폴더에 남겨둠)
- [x] 2단계: `pokemon_pokedex_form_data.js` 분리 (5종 → 실제로는 `DEX_FORM_BUCKET_ORDER`를 추가로 발견해 6종 테이블로 분리)
- [x] 3단계: `script.js` 슬림화(공용 계층만 남김, 5,747줄 → 409줄)
- [x] 4단계: `pokemon_learning.js` 분리 — `setQuizAnswerHandlers(onCorrect, onWrong)` 콜백 구조 적용 (172줄)
- [x] 5단계: `pokemon_pokedex.js` 분리 (802줄)
- [x] 6단계: `pokemon_catch.js` 분리 (807줄)
- [x] 7단계: `pokemon_battle.js` 분리 (1,508줄)
- [x] 8단계: index.html `<script>` 태그 최종 정리 (3.2절 순서 그대로 반영)
- [x] 9단계: `CHANGELOG.md`에 `## 65.`로 기록

### 실행 중 계획과 달라진 부분

- **`script.js`(공용)에 계획보다 더 많이 남음**: 실제 호출부를 전수 확인한 결과 `CATEGORY_FOLDER`(도감·포획·배틀 3곳 모두 사용), `NORMAL_IDS`/`MEGA_IDS`/`GMAX_IDS`/`NORMAL_BY_SPECIES`/`DEX_SPECIES_ORDER`(도감+포획 공유), 샤이니 이펙트 리소스 상수(`SHINY_EFFECT_SRC` 등, 공용 함수 `playShinyEffect()`가 사용)도 공용으로 확인되어 script.js에 추가로 남김.
- **`alignWildMonsterTopToHpBar()`, `backSpriteInfo`/`baseBackSpriteInfo`/`displayBackSprite` 계열**: 이름은 범용적으로 들리지만 실제로는 배틀 전용으로 확인되어(전자는 `battlePreviewActive` 체크, 후자는 뒷모습 표시가 배틀에만 있음) `pokemon_battle.js`로 배치.
- **섹션 주석 경계와 실제 코드 경계가 다른 곳이 2군데 더 발견됨**: "포켓몬 정보 화면" 섹션 끝(도감 로직이 아니라 포획 확률/현재 몬스터 상태 상수), "포켓몬 배틀 선택" 섹션 끝(배틀 위젯 이벤트 연결 사이에 포획 게임 자체의 시작/재시작/결과화면 버튼 연결 코드가 섞여 있었음) — 전부 실제 호출 관계 기준으로 올바른 파일에 배치.
- **`dexBtnResult`(결과화면의 도감 버튼) 이벤트 연결 한 줄**: 원래 도감 섹션 코드 사이에 있었지만, 그 버튼 자체가 포획 결과화면 DOM이라 `pokemon_catch.js`로 옮김(로드 순서상 `pokemon_pokedex.js`가 먼저 실행되므로 `openDexModalNormal()`은 이미 정의돼 있어 문제 없음).
- **검증 방식**: 전체 5,747줄 누락·중복 없이 재배치 확인, 5개 로직 파일 + 5개 데이터 파일 전체 최상위 선언 중복 검사(0건), 로드 순서대로 이어붙여 `node --check` 통과까지 확인. 브라우저 실제 동작 확인은 사용자 몫.

---
**계획 실행 완료. 다음은 사용자가 브라우저에서 직접 새로고침해서 확인하는 단계.**
