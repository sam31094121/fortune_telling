/**
 * 한국어(ko) 표시 전용 사전 통합본. 키는 바이트 단위로 동일한 중국어 원문입니다.
 * 표시 전용: 번역문을 계산 입력으로 사용하지 마십시오.
 * 같은 키가 여러 파일에 있으면 뒤에 오는 파일이 우선합니다(검사 스크립트로 중복이 없도록 관리).
 */
import { homeKoreanCopy } from './home';
import { formKoreanCopy } from './form';
import { birthdayKoreanCopy } from './birthday';
import { resultKoreanCopy } from './result';
import { pagesKoreanCopy } from './pages';

export const koreanCopy: Record<string, string> = {
  ...homeKoreanCopy,
  ...formKoreanCopy,
  ...birthdayKoreanCopy,
  ...resultKoreanCopy,
  ...pagesKoreanCopy,
};
