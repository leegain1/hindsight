# HINDSIGHT+ React Native Migration Guide

> 이 문서는 HINDSIGHT+ 웹앱(Next.js 16)을 React Native(Expo)로 전환하기 위한 설계 문서입니다.
> 모바일 프로젝트: `C:\Users\USER\Desktop\hindsight-plus-mobile`

---

## 1. 공유 가능한 로직 (그대로 복사)

아래 파일들은 브라우저/Node.js API를 사용하지 않아 **수정 없이** React Native에서 동작합니다.

| 웹 경로 | 설명 | 이식 가능 여부 |
|---|---|---|
| `src/lib/scoring.ts` | 제품 점수 계산 (Nutriscore, NOVA, 첨가물) | ✅ 완전 이식 |
| `src/lib/profiling.ts` | 민감도 프로파일 계산 및 메타데이터 | ✅ 완전 이식 |
| `src/lib/supabase.ts` | Supabase 클라이언트 | ⚠️ 어댑터 교체 필요 |

### Supabase 클라이언트 교체

```typescript
// 웹: @supabase/ssr 의 createBrowserClient
import { createBrowserClient } from "@supabase/ssr";

// React Native: @supabase/supabase-js + AsyncStorage 어댑터
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // RN에서는 false
    },
  }
);
```

---

## 2. 네이티브로 교체해야 할 부분

### 2.1 카메라 / 바코드 스캔

| 웹 | React Native |
|---|---|
| `html5-qrcode` | `expo-camera` + `expo-barcode-scanner` |
| `navigator.mediaDevices.getUserMedia` | `Camera` 컴포넌트의 permission hook |

```tsx
// React Native 바코드 스캔 예시
import { CameraView, useCameraPermissions } from "expo-camera";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  return (
    <CameraView
      style={{ flex: 1 }}
      facing="back"
      onBarcodeScanned={({ data }) => {
        router.push(`/scan/result/${encodeURIComponent(data)}`);
      }}
      barcodeScannerSettings={{
        barcodeTypes: ["ean13", "ean8", "qr", "upc_a", "upc_e"],
      }}
    />
  );
}
```

### 2.2 스토리지

| 웹 | React Native |
|---|---|
| `localStorage` | `@react-native-async-storage/async-storage` |
| `sessionStorage` | 메모리 state |
| 민감 데이터 (토큰) | `expo-secure-store` |

```typescript
// 웹
localStorage.setItem("key", JSON.stringify(data));
const raw = localStorage.getItem("key");

// React Native
import AsyncStorage from "@react-native-async-storage/async-storage";
await AsyncStorage.setItem("key", JSON.stringify(data));
const raw = await AsyncStorage.getItem("key");
```

### 2.3 네비게이션

| 웹 (Next.js App Router) | React Native (Expo Router) |
|---|---|
| `useRouter()` from `next/navigation` | `useRouter()` from `expo-router` |
| `router.push("/scan")` | `router.push("/scan")` ← **동일!** |
| `<Link href="/community">` | `<Link href="/community">` ← **동일!** |
| `useSearchParams()` | `useLocalSearchParams()` |
| `params` Promise (서버 컴포넌트) | `useLocalSearchParams()` (클라이언트) |

### 2.4 스타일링

웹의 인라인 스타일 객체는 React Native에서 거의 그대로 동작하나, 일부 CSS 속성은 교체 필요:

| CSS (웹) | React Native StyleSheet |
|---|---|
| `boxShadow` | `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` (iOS) / `elevation` (Android) |
| `border: "0.5px solid #D8D4CC"` | `borderWidth: 0.5`, `borderColor: "#D8D4CC"` |
| `overflow: "hidden"` | 동일 ✅ |
| `flexDirection`, `alignItems` 등 | 동일 ✅ |
| `position: "fixed"` | `position: "absolute"` (RN에는 fixed 없음) |
| `cursor: "pointer"` | 불필요 (터치) |
| `@keyframes` 애니메이션 | `react-native-reanimated` |

### 2.5 공유/알림

| 웹 | React Native |
|---|---|
| `navigator.share()` | `expo-sharing` 또는 `Share` from `react-native` |
| `navigator.clipboard` | `expo-clipboard` |
| 푸시 알림 없음 | `expo-notifications` |

---

## 3. 추천 라이브러리

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-camera": "~16.0.0",
    "expo-notifications": "~0.29.0",
    "expo-secure-store": "~14.0.0",
    "expo-sharing": "~12.0.0",
    "expo-clipboard": "~7.0.0",
    "@supabase/supabase-js": "^2.103.0",
    "@react-native-async-storage/async-storage": "^2.1.0",
    "react-native-reanimated": "~3.16.0",
    "@shopify/flash-list": "^1.7.1",
    "expo-google-fonts": "스크린별 필요 폰트만",
    "expo-linear-gradient": "~14.0.0"
  }
}
```

### 라이브러리 선택 이유

- **`expo-camera`**: 바코드 스캔 내장, 권한 훅 제공
- **`expo-notifications`**: iOS/Android 푸시 통합, Expo 푸시 서버 지원
- **`react-native-reanimated`**: 웹의 CSS transition/animation 대체, 60fps 보장
- **`@shopify/flash-list`**: 커뮤니티 피드 등 긴 목록 성능 최적화 (FlatList 대체)
- **`expo-secure-store`**: Supabase 세션 토큰을 기기 Keychain에 안전하게 저장

---

## 4. Expo Router 라우트 매핑

```
Next.js App Router          →    Expo Router (app/)
─────────────────────────────────────────────────────
/                           →    (tabs)/index.tsx
/scan                       →    (tabs)/scan.tsx
/scan/result/[barcode]      →    scan/result/[barcode].tsx
/community                  →    (tabs)/community.tsx
/community/[id]             →    community/[id].tsx
/community/write            →    community/write.tsx
/categories                 →    (tabs)/categories.tsx
/categories/[slug]          →    categories/[slug].tsx
/profile                    →    (tabs)/profile.tsx
/auth/login                 →    auth/login.tsx
/onboarding                 →    onboarding.tsx
/ingredient/[id]            →    ingredient/[id].tsx
```

### Expo Router 파일 구조

```
app/
├── _layout.tsx               # Root: Stack navigator + auth
├── (tabs)/
│   ├── _layout.tsx           # Tab bar (HOME / SCAN / COMMUNITY / CATEGORY / PROFILE)
│   ├── index.tsx             # 홈
│   ├── scan.tsx              # 스캔
│   ├── community.tsx         # 커뮤니티 피드
│   ├── categories.tsx        # 카테고리
│   └── profile.tsx           # 프로필
├── scan/
│   └── result/
│       └── [barcode].tsx     # 스캔 결과
├── community/
│   ├── [id].tsx              # 포스트 상세
│   └── write.tsx             # 글쓰기
├── categories/
│   └── [slug].tsx            # 카테고리 상세
├── ingredient/
│   └── [id].tsx              # 성분 상세
├── auth/
│   └── login.tsx             # 로그인
└── onboarding.tsx            # 온보딩
```

---

## 5. 디자인 시스템 마이그레이션

### 5.1 색상 토큰 (그대로 사용)

```typescript
// constants/design.ts
export const Colors = {
  bg:       "#F5F2EC",
  text:     "#0A0A0A",
  muted:    "#8A8880",
  border:   "#D8D4CC",
  card:     "#EDEAE3",
  dark:     "#0A0A0A",
  // Score colors
  scoreGood:    "#2A8A5C",
  scoreOk:      "#C4780A",
  scoreBad:     "#C05000",
  scorePoor:    "#C44B4B",
  // Category colors
  water:        "#3B7DD4",
  supplements:  "#2A8A5C",
  processedFood:"#C4780A",
  personalCare: "#8A5BC4",
  emf:          "#C44B4B",
  household:    "#8A7A2A",
} as const;

export const FontFamily = {
  sans:  "SpaceGrotesk",      // expo-google-fonts/space-grotesk
  mono:  "DMMono",            // expo-google-fonts/dm-mono
} as const;

export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  full: 999,
} as const;
```

### 5.2 폰트 로드 (Expo)

```typescript
// app/_layout.tsx
import {
  SpaceGrotesk_300Light,
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
} from "@expo-google-fonts/space-grotesk";
import {
  DMMono_300Light,
  DMMono_400Regular,
} from "@expo-google-fonts/dm-mono";
import { useFonts } from "expo-font";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk: SpaceGrotesk_400Regular,
    "SpaceGrotesk-Light": SpaceGrotesk_300Light,
    "SpaceGrotesk-Medium": SpaceGrotesk_500Medium,
    DMMono: DMMono_400Regular,
    "DMMono-Light": DMMono_300Light,
  });

  if (!fontsLoaded) return null;
  return <Stack />;
}
```

### 5.3 스타일 변환 예시

```tsx
// 웹 (Next.js)
<div style={{
  background: "#EDEAE3",
  border: "0.5px solid #D8D4CC",
  borderRadius: 12,
  padding: "14px 16px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
}}>

// React Native
import { StyleSheet, View } from "react-native";
<View style={styles.card}>

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EDEAE3",
    borderWidth: 0.5,
    borderColor: "#D8D4CC",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3, // Android
  },
});
```

---

## 6. 마이그레이션 우선순위

| 순위 | 스크린 | 이유 |
|---|---|---|
| 1 | 홈 + 스캔 | 핵심 가치 제안 |
| 2 | 스캔 결과 | 스캔 후 즉시 노출 |
| 3 | 로그인 / 온보딩 | 사용자 획득 |
| 4 | 프로필 + 히스토리 | 리텐션 |
| 5 | 커뮤니티 | 소셜 기능 |
| 6 | 성분/카테고리 상세 | 심화 정보 |

---

## 7. Expo 환경변수

`.env` (web의 `.env.local` 대응):

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_ANTHROPIC_API_KEY=   ← 앱에 포함하면 안됨! API Proxy 서버 경유 필수
```

> **⚠️ 중요**: `ANTHROPIC_API_KEY`는 클라이언트 앱에 포함하지 마세요.
> 배포된 웹앱의 `/api/*` 엔드포인트를 그대로 프록시로 활용하거나,
> Supabase Edge Functions로 이전하세요.

---

## 8. Supabase Realtime (커뮤니티 댓글)

웹과 동일하게 동작합니다:

```typescript
const channel = supabase
  .channel(`post-${id}`)
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "community_comments",
    filter: `post_id=eq.${id}`,
  }, (payload) => {
    setComments((prev) => [...prev, payload.new as Comment]);
  })
  .subscribe();
```
