# 구현된 기능 목록

> 현재까지 구현되고 완성된 모든 함수와 기능들을 정리한 문서입니다.

## 📦 selector-core.js
### 셀렉터 생성 엔진

웹 요소에서 다양한 형식의 셀렉터를 생성합니다.

#### 헬퍼 함수

**`escapeAttrValue(str)`**
- 용도: CSS 속성 선택자의 속성값을 올바르게 이스케이프
- 입력: 문자열
- 출력: 이스케이프된 문자열
- 버그 수정: CSS.escape()는 식별자용이므로, 속성값용으로 백슬래시와 큰따옴표 이스케이프

**`escapeXPathText(text)`**
- 용도: XPath 문자열 표현에서 따옴표 처리
- 입력: 텍스트
- 출력: XPath용 문자열 (따옴표로 감싸거나 concat 함수 사용)
- 버그 수정: XPath 1.0에서 따옴표 혼합 처리

**`getNthOfType(element)`**
- 용도: 요소의 동일 태그 형제 중 위치 계산
- 입력: DOM 요소
- 출력: `div:nth-of-type(3)` 형식의 셀렉터 또는 빈 문자열
- 버그 수정: nth-child가 아닌 nth-of-type 올바르게 사용

**`buildFullCssPath(element)`**
- 용도: 요소의 전체 CSS 경로 생성
- 입력: DOM 요소
- 출력: `#app > div > button:nth-of-type(2)` 형식의 절대 경로
- 동작:
  - ID를 만나면 거기서 중단
  - 형제 요소가 여러 개면 nth-of-type 추가
  - 루트까지 역추적

**`buildXPath(element)`**
- 용도: 요소의 XPath 표현 생성
- 입력: DOM 요소
- 출력: `//button[@id="login"]` 또는 `/html/body/...` 형식
- 버그 수정:
  - ID 앵커가 있으면 `//` 사용
  - 없으면 절대 경로 `/html/body/...` 사용
- 동작: XPath 1.0 호환성

#### 셀렉터 생성 함수

**생성되는 셀렉터 타입들:**

1. **ID 셀렉터** - `#element-id`
   - 존재하면 가장 먼저 반환

2. **클래스 셀렉터** - `.class1.class2`
   - 모든 클래스를 조합하여 생성

3. **태그 셀렉터** - `button`, `div`
   - 요소의 태그명

4. **속성 셀렉터** - `[data-testid="value"]`
   - 중요 속성들을 선택:
     - 테스트용: data-testid, data-id, data-cy, data-test
     - 접근성: aria-label, aria-labelledby, role
     - 기본: name, type, placeholder, value
     - 링크/미디어: href, src, alt, title, for

5. **nth-of-type** - `div:nth-of-type(3)`
   - 동일 태그 형제 중 위치

6. **Full Path** - `#app > div > button:nth-of-type(2)`
   - ID 또는 루트까지의 절대 경로

7. **XPath** - `//button[@id="login"]`
   - ID 기반 또는 절대 경로 기반

8. **Text XPath** - `//button[contains(text(),'로그인')]`
   - 텍스트 내용 기반 (공백 정규화)

#### 검증 함수

**`validateSelector(selector, type)`**
- 용도: 생성된 셀렉터 검증
- 입력: 셀렉터 문자열, 타입 (css/xpath)
- 출력: `{valid: boolean, message: string}`
- 동작:
  - CSS 셀렉터 문법 검사
  - XPath 문법 검사
  - 실제 요소 선택 가능 여부 확인

---

## 📄 content.js
### 컨텐츠 스크립트 - 웹페이지에서 클릭 감지

웹페이지에 주입되어 클릭 이벤트를 감지하고 셀렉터를 수집합니다.

#### 상태 관리

- `collecting` - 수집 활성 여부
- `lastHighlighted` - 마지막으로 하이라이트된 요소
- `statusBar` - 상태 표시 바
- `styleElement` - 주입된 스타일 요소

#### UI 헬퍼 함수

**`injectStyles()`**
- 용도: CSS 스타일 주입
- 스타일:
  - 상태 바: 상단 3px 그래디언트 애니메이션
  - 하이라이트: 파란색 outline (3px)

**`removeStyles()`**
- 용도: 주입된 스타일 제거

**`createStatusBar()`**
- 용도: 수집 활성 상태를 표시하는 상단 바 생성
- 표시: 파란색~초록색 그래디언트 애니메이션

**`removeStatusBar()`**
- 용도: 상태 바 제거

**`clearHighlight()`**
- 용도: 마지막 하이라이트 제거

#### 이벤트 핸들러

**`handleClick(e)`**
- 용도: 웹페이지 클릭 이벤트 처리
- 동작:
  1. 수집 모드 확인
  2. 자신의 UI 클릭 무시
  3. 클릭된 요소에 하이라이트 적용
  4. `selector-core.js`를 사용해 모든 셀렉터 생성
  5. 결과를 Background로 전송

**`handleMessage(message, sender, sendResponse)`**
- 용도: Background와의 메시지 처리
- 메시지 타입:
  - `START_COLLECTING` - 수집 시작
  - `STOP_COLLECTING` - 수집 중지
  - `PING` - 스크립트 존재 확인
  - `VALIDATE_SELECTOR` - 선택자 검증

#### 수집 제어

**`startCollecting()`**
- 스타일 주입
- 상태 바 생성
- 클릭 이벤트 리스너 등록
- 마우스 무브 리스너 등록 (호버 표시)

**`stopCollecting()`**
- 스타일 제거
- 상태 바 제거
- 이벤트 리스너 제거
- 하이라이트 제거

#### 선택자 검증

**`validateSelector(selector, type)`**
- 용도: 셀렉터가 실제로 요소를 선택할 수 있는지 확인
- CSS 셀렉터: `document.querySelector()` 테스트
- XPath: `document.evaluate()` 테스트
- 반환: 유효한 요소 수

---

## 🖥️ background.js
### Service Worker - 확장 프로그램 백그라운드 프로세스

탭 관리, 메시지 라우팅, 상태 관리를 담당합니다.

#### 상태 관리

**`getCollectingTabId()`**
- 용도: 현재 수집 중인 탭 ID 조회
- 출력: `tabId` 또는 `null`
- 저장 위치: `chrome.storage.local`

**`setCollectingTabId(tabId)`**
- 용도: 수집 중인 탭 ID 설정
- 입력: `tabId` 또는 `null` (초기화)

#### 콘텐츠 스크립트 관리

**`ensureContentScript(tabId)`**
- 용도: 탭에 콘텐츠 스크립트가 주입되어 있는지 확인
- 동작:
  1. PING 메시지 전송 시도
  2. 응답 없으면 `selector-core.js`와 `content.js` 주입
- 상황: 동적 탭 이동이나 새로 열린 탭에서 필요

#### 메시지 처리

**`chrome.runtime.onMessage.addListener()`**

수신 메시지 타입:

1. **`START_COLLECTING`** (사이드패널에서)
   - 현재 활성 탭에서 수집 시작
   - 이전 탭 수집 중지
   - 콘텐츠 스크립트 주입
   - 수집 탭 ID 저장

2. **`STOP_COLLECTING`** (사이드패널에서)
   - 현재 수집 중인 탭에 중지 신호 전송
   - 수집 탭 ID 초기화

3. **`GET_COLLECTING_STATE`** (사이드패널에서)
   - 현재 수집 상태 반환
   - 탭 유효성 확인
   - 응답: `{collecting: boolean, tabId?: number}`

4. **`VALIDATE_SELECTOR`** (사이드패널에서)
   - 메시지를 수집 중인 탭으로 포워딩
   - 선택자 검증 결과 반환

5. **`SELECTORS_COLLECTED`** (콘텐츠 스크립트에서)
   - 사이드패널로 포워딩
   - 히스토리 업데이트용

#### 탭 이벤트

**`chrome.tabs.onRemoved.addListener()`**
- 용도: 탭 종료 감지
- 동작:
  - 수집 중인 탭이 종료되면 상태 초기화
  - 사이드패널에 상태 변화 알림

**`chrome.tabs.onActivated.addListener()`**
- 용도: 탭 전환 감지
- 동작: 사이드패널에 활성 탭 정보 알림

#### UI 업데이트

**`notifySidePanel(type, data)`**
- 용도: 사이드패널에 상태 변화 알림
- 메시지 타입:
  - `COLLECTING_STATE_CHANGED`
  - `TAB_SWITCHED`
  - `STOPPED_BY_TAB_CLOSE`

---

## 🎛️ sidepanel.js
### 사이드패널 UI 및 상호작용

사용자 인터페이스 제어, 히스토리 관리, 파일 내보내기를 담당합니다.

#### 상태 관리

- `collecting` - 수집 활성 여부
- `history` - 수집 히스토리 배열
- `lastProcessedTimestamp` - 마지막 처리 시간 (중복 방지)

#### DOM 요소 참조

**제어 요소**
- `toggleBtn` - 수집 시작/중지
- `savBtn` - JSON 저장
- `dirBtn` - 디렉토리 설정
- `exportBtn` - 내보내기

**상태 표시**
- `statusDot` - 활성 상태 점
- `statusText` - 상태 텍스트
- `footerStatus` - 하단 상태

**표시 영역**
- `elementCard` - 요소 정보 카드
- `selectorsGrid` - 셀렉터 그리드
- `historyPanel` - 히스토리 패널
- `historyList` - 히스토리 목록

#### 초기화

**`DOMContentLoaded` 이벤트**
1. 저장된 히스토리 로드
2. 디렉토리 핸들 복원
3. 수집 상태 확인 (Background 쿼리)

#### UI 업데이트

**`setCollectingUI(active)`**
- 용도: 수집 상태에 따라 UI 업데이트
- 변경사항:
  - 버튼 텍스트: "Start Collecting" ↔ "Stop Collecting"
  - 상태 점: 활성/비활성
  - 상태 텍스트: "수집 중..." ↔ "대기 중"

**`displayElementInfo(info)`**
- 용도: 클릭된 요소 정보 표시
- 표시 항목:
  - 태그명: `<button>`
  - ID: `#button-id`
  - 클래스: `.class1.class2`
  - URL: 현재 페이지 URL

**`displaySelectors(selectors, validation)`**
- 용도: 생성된 셀렉터들을 그리드에 표시
- 각 셀렉터마다:
  - 타입 뱃지
  - 셀렉터 문자열
  - 유효성 표시
  - 복사 버튼

**`displayHistory()`**
- 용도: 히스토리 목록 업데이트
- 표시: 최신 순서로 아이템 나열

#### 데이터 관리

**`loadHistoryFromStorage()`**
- 용도: IndexedDB에서 히스토리 로드
- 저장 키: `selectorHistory`

**`saveHistoryToStorage()`**
- 용도: 히스토리를 IndexedDB에 저장
- 제한: 최대 20개 항목 유지

**`addToHistory(item)`**
- 용도: 새로운 수집 항목 히스토리에 추가
- 동작:
  - 중복 방지 (타임스탬프 확인)
  - 최대 20개 유지
  - 즉시 저장

**`clearHistory()`**
- 용도: 히스토리 전체 삭제
- 확인: 사용자 확인 후 실행

#### 파일 내보내기

**`exportHistory()`**
- 용도: 수집된 데이터를 JSON으로 내보내기
- 동작:
  1. 파일명 생성: `selectors_YYYYMMDD_HHMMSS.json`
  2. 파일 시스템 API 사용 (fs-storage.js)
  3. 성공/실패 알림

**`updateSaveButton()`**
- 용도: 저장 버튼 활성화/비활성화
- 조건: 히스토리 존재 && 디렉토리 설정됨

#### 이벤트 리스너

**`toggleBtn` 클릭**
- 수집 시작/중지 신호를 Background로 전송

**`savBtn` 클릭**
- 현재 요소의 셀렉터 저장 (히스토리에 추가)

**`dirBtn` 클릭**
- `fs-storage.js`의 `selectDirectory()` 호출
- 사용자가 디렉토리 선택

**`exportBtn` 클릭**
- `exportHistory()` 실행

**`clearHistoryBtn` 클릭**
- `clearHistory()` 실행

#### 메시지 처리

**`chrome.runtime.onMessage.addListener()`**

수신 메시지:

1. **`SELECTORS_COLLECTED`**
   - 콘텐츠 스크립트에서 받은 수집 데이터
   - 히스토리에 추가
   - UI에 표시

2. **`COLLECTING_STATE_CHANGED`**
   - 수집 상태 변화 알림
   - UI 업데이트

3. **`TAB_SWITCHED`**
   - 탭 전환 감지
   - 필요하면 상태 확인

#### 유효성 검증

**`validateSelectorsRealTime()`**
- 용도: 각 셀렉터의 유효성 실시간 확인
- 동작:
  1. 현재 활성 탭의 콘텐츠 스크립트로 검증 요청
  2. 결과 표시 (✓/✗)

---

## 🔧 lib/idb-helper.js
### IndexedDB 데이터베이스 래퍼

확장 프로그램의 데이터 저장소로 사용됩니다.

#### 설정

- **DB 이름**: `SelectorCollectorDB`
- **DB 버전**: `1`
- **스토어 이름**: `keyval`

#### 함수

**`openDB()`**
- 용도: IndexedDB 연결 열기
- 반환: Promise<IDBDatabase>
- 동작:
  - DB가 없으면 자동 생성
  - 스토어가 없으면 자동 생성

**`get(key)`**
- 용도: 데이터 조회
- 입력: 키 (문자열)
- 출력: Promise<any>
- 예: `await IdbHelper.get('selectorHistory')`

**`set(key, value)`**
- 용도: 데이터 저장
- 입력: 키, 값
- 출력: Promise<void>
- 예: `await IdbHelper.set('selectorHistory', data)`

**`del(key)`**
- 용도: 데이터 삭제
- 입력: 키
- 출력: Promise<void>
- 예: `await IdbHelper.del('selectorHistory')`

#### 사용 사례

1. **히스토리 저장**
   ```javascript
   await IdbHelper.set('selectorHistory', historyArray);
   ```

2. **디렉토리 핸들 저장**
   ```javascript
   await IdbHelper.set('directoryHandle', dirHandle);
   ```

3. **사용자 설정 저장**
   ```javascript
   await IdbHelper.set('userPreferences', {maxHistory: 20});
   ```

---

## 💾 lib/fs-storage.js
### File System Access API 래퍼

파일 시스템에 데이터를 저장합니다.

#### 상태

- `dirHandle` - 선택된 디렉토리의 FileSystemDirectoryHandle

#### 함수

**`selectDirectory()`**
- 용도: 사용자에게 디렉토리 선택 다이얼로그 표시
- 반환: Promise<boolean>
- 동작:
  1. 파일 선택 다이얼로그 표시
  2. 선택된 디렉토리 핸들 저장
  3. IndexedDB에도 저장
  4. true/false 반환
- 예외: AbortError (사용자 취소) - false 반환

**`ensurePermission()`**
- 용도: 디렉토리 접근 권한 확인/요청
- 반환: Promise<boolean>
- 동작:
  1. 핸들이 없으면 false
  2. 권한 확인 (`queryPermission`)
  3. 없으면 요청 (`requestPermission`)
  4. 결과 반환

**`saveJson(filename, data)`**
- 용도: JSON 데이터를 파일로 저장
- 입력: 파일명, 데이터 객체
- 반환: Promise<void>
- 동작:
  1. 권한 확인
  2. 파일 생성/오버라이트
  3. JSON 형식으로 저장 (들여쓰기 2칸)
- 예외: "디렉토리 접근 권한이 없습니다"

**`restoreHandle()`**
- 용도: IndexedDB에서 저장된 디렉토리 핸들 복원
- 반환: Promise<boolean>
- 동작: IndexedDB에서 핸들 로드, 성공 여부 반환

**`isReady()`**
- 용도: 디렉토리 핸들이 준비되었는지 확인
- 반환: boolean
- 예: `if (FsStorage.isReady()) { ... }`

#### 사용 사례

1. **디렉토리 선택**
   ```javascript
   const success = await FsStorage.selectDirectory();
   if (success) {
     // 디렉토리 선택됨
   }
   ```

2. **데이터 저장**
   ```javascript
   await FsStorage.saveJson('selectors.json', historyData);
   ```

3. **권한 확인**
   ```javascript
   const canWrite = await FsStorage.ensurePermission();
   ```

---

## 📊 구현 현황 요약

| 모듈 | 상태 | 구현 함수 개수 |
|------|------|---|
| selector-core.js | ✅ 완성 | 8+ |
| content.js | ✅ 완성 | 10+ |
| background.js | ✅ 완성 | 6+ |
| sidepanel.js | ✅ 완성 | 10+ |
| lib/idb-helper.js | ✅ 완성 | 4 |
| lib/fs-storage.js | ✅ 완성 | 5 |

**총 함수/기능: 50+ 개 구현 완료**

