# Frontend Tech Stack

## 1. Framework & Language

| 기술       | 버전   | 용도                     |
| ---------- | ------ | ------------------------ |
| Next.js    | 16.4.6 | React 기반 웹 프레임워크 |
| React      | 19.3.0 | UI 구성                  |
| TypeScript | 5.9.3  | 정적 타입 검사           |

## 2. UI & Styling

| 기술         | 버전         | 용도                              |
| ------------ | ------------ | --------------------------------- |
| Tailwind CSS | 4.3.3        | CSS 스타일링                      |
| shadcn/ui    | 4.23.0 (CLI) | UI 컴포넌트 구성                  |
| Base UI      | 1.9.0        | UI 프리미티브                     |
| Lucide React | 1.76.0       | 아이콘                            |
| AG Grid      | 36.3.0       | 검사 항목 및 측정값 데이터 테이블 |

## 3. State & Data Management

| 기술           | 버전    | 용도                      |
| -------------- | ------- | ------------------------- |
| TanStack Query | 5.108.1 | 서버 데이터 조회 및 캐싱  |
| Zustand        | 5.1.0   | 전역 클라이언트 상태 관리 |

## 4. Form & Validation

| 기술                | 버전   | 용도                       |
| ------------------- | ------ | -------------------------- |
| React Hook Form     | 7.92.0 | 폼 상태 및 입력 관리       |
| Zod                 | 4.6.7  | 데이터 유효성 검사         |
| @hookform/resolvers | 7.0.7  | React Hook Form과 Zod 연동 |

## 5. Utility

| 기술   | 버전    | 용도              |
| ------ | ------- | ----------------- |
| Day.js | 1.11.23 | 날짜 및 시간 처리 |

## 6. Code Quality

| 기술                   | 버전   | 용도                        |
| ---------------------- | ------ | --------------------------- |
| ESLint                 | 9.39.5 | 코드 품질 및 오류 검사      |
| Prettier               | 3.10.1 | 코드 포맷팅                 |
| eslint-config-prettier | 10.1.8 | ESLint와 Prettier 충돌 방지 |

## 7. Testing & Documentation

| 기술       | 상태      | 용도                       |
| ---------- | --------- | -------------------------- |
| Storybook  | 설치 예정 | UI 컴포넌트 개발 및 문서화 |
| Vitest     | 설치 예정 | 단위 테스트                |
| Playwright | 설치 예정 | E2E 테스트                 |

## 8. Project Structure

Next.js App Router를 기반으로 FSD(Feature-Sliced Design)의 핵심 개념을 적용한 FSD Lite 구조를 사용한다.

### Directory Structure

```text
src/
├── app/                              # Next.js 라우팅 및 페이지
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   │
│   ├── (main)/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── inspections/
│   │   │   ├── page.tsx
│   │   │   ├── new/
│   │   │   │   └── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── products/
│   │   │   └── page.tsx
│   │   └── history/
│   │       └── page.tsx
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── widgets/                          # 독립적인 UI 블록
│   ├── header/
│   ├── sidebar/
│   └── inspection-table/
│
├── features/                         # 사용자 행동 및 업무 기능
│   ├── auth/
│   │   ├── login/
│   │   └── logout/
│   ├── inspection/
│   │   ├── create-inspection/
│   │   ├── edit-inspection/
│   │   └── submit-inspection/
│   └── product/
│       └── search-product/
│
├── entities/                         # 핵심 비즈니스 도메인
│   ├── user/
│   ├── product/
│   ├── inspection/
│   └── inspection-item/
│
└── shared/                           # 공통 리소스
    ├── api/
    ├── ui/                            # shadcn/ui 기반 공통 UI
    ├── hooks/
    ├── lib/
    ├── types/
    └── constants/
```

### Layer Responsibilities

| 계층     | 책임                             | 예시                            |
| -------- | -------------------------------- | ------------------------------- |
| app      | URL 라우팅 및 페이지 조립        | 검사 등록 페이지                |
| widgets  | 재사용 가능한 큰 UI 블록         | 사이드바, 검사 테이블           |
| features | 사용자 행동 및 업무 처리         | 검사 등록, 검사 제출, 제품 검색 |
| entities | 핵심 도메인 데이터와 로직        | 제품, 검사, 검사 항목           |
| shared   | 도메인에 종속되지 않는 공통 코드 | 버튼, API 클라이언트, 유틸리티  |

### Dependency Rules

계층 간 의존성은 상위 계층에서 하위 계층 방향으로만 허용한다.

```text
app
 ↓
widgets
 ↓
features
 ↓
entities
 ↓
shared
```

- 하위 계층에서 상위 계층을 참조하지 않는다.
- 다른 기능 모듈 간 직접 참조는 최소화한다.
- 외부 모듈에 공개할 코드는 각 모듈의 공개 진입점을 통해 제공한다.
- 실제 코드가 필요해질 때 폴더와 파일을 추가한다.

## 9. Development Principles

- TypeScript를 사용하여 타입 안정성을 확보한다.
- 기능별로 컴포넌트와 비즈니스 로직을 분리한다.
- 서버 상태는 TanStack Query로 관리한다.
- 클라이언트 전역 상태는 Zustand로 관리한다.
- 폼 데이터는 React Hook Form과 Zod로 관리한다.
- 공통 UI 컴포넌트는 shadcn/ui 기반으로 구성한다.
- 검사 데이터 테이블은 AG Grid를 활용한다.
- ESLint와 Prettier를 통해 코드 스타일을 통일한다.
- 재사용 가능한 컴포넌트 중심으로 개발한다.
