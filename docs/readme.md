
홈페이지 내 요소의 셀렉터가 여러개일 수 있는데 내가 클릭한 것들의 모든 셀렉터를 수집 할 수 있어? F12 dev tool의 recorder는 할 수 있던데
오후 7:50

클릭 요소의 다양한 셀렉터를 수집하는 JavaScript 도구 설계했다
네, 만들어 드릴 수 있습니다! 클릭한 요소의 가능한 모든 셀렉터를 수집하는 도구를 만들어 드릴게요.

도구의 다양한 셀렉터 수집 기능을 종합적으로 검토했습니다
Selector Collector 도구를 만들었습니다! 세 가지 방법으로 사용할 수 있어요.
🎯 수집하는 셀렉터 종류
타입	예시
ID	#login-btn
Classes	.btn.btn-primary
Tag	button
속성	button[data-testid="submit"]
nth-child	div:nth-child(3)
Full Path	#app > div > button:nth-child(2)
XPath	//button[@id="login"]
Text XPath	//button[contains(text(),'로그인')]
사용 방법
1. 북마클릿 (권장)
HTML 파일을 열고 초록색 버튼을 북마크바로 드래그
아무 웹페이지에서 클릭하면 바로 사용
2. 콘솔 스크립트
F12 → Console에 스크립트 붙여넣기
window.selectorCollector.toggle() 로 켜기/끄기
window.selectorCollector.getHistory() 로 수집 내역 조회
3. 데모 탭
HTML 파일에서 직접 테스트 가능
추가 기능
📜 클릭 히스토리 저장 (최대 20개)
📥 JSON으로 내보내기
📋 원클릭 복사
Chrome DevTools Recorder처럼 요소를 클릭하면 가능한 모든 셀렉터가 자동으로 수집됩니다!
