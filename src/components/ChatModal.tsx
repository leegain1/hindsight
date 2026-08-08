"use client";

/**
 * AI 챗봇 모달.
 *
 * 전체 화면 페이지(/search)가 아니라 홈 위에 뜨는 모달이다 —
 * 흐린 검정 배경 뒤로 홈이 비쳐서 "앱을 떠나지 않았다"는 감각이 유지된다.
 *
 * 레이아웃은 메신저 관습을 따른다: 대화가 위에서 아래로 쌓이고 입력창이 하단 고정.
 * 기존 /search 는 검색창이 위에 있고 결과가 아래 나오는 검색 UI 라 대화처럼 안 읽혔다.
 *
 * 답변은 /api/fact-check 를 쓰고, 키가 없어 실패하면 목 답변으로 떨어진다 —
 * 발표 중에 챗봇이 침묵하면 안 된다.
 */

import { useEffect, useRef, useState } from "react";

const INK = "#0A0A0A";
const CANVAS = "#F5F2EC";
const CARD = "#EDEAE3";
const HAIRLINE = "#D8D4CC";
const MUTED = "#8A8880";

const SANS = "'Space Grotesk', -apple-system, sans-serif";
const MONO = "'DM Mono', monospace";

interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  /** 답변에 붙는 근거 출처 */
  sources?: string[];
}

const SUGGESTIONS = [
  "아스파탐 매일 먹어도 되나요?",
  "이 성분, 임산부도 먹어도 될까요?",
  "제가 먹는 혈압약이랑 같이 먹어도 되나요?",
  "무설탕이면 당이 아예 없나요?",
  "견과류 알레르기인데 뭘 봐야 하나요?",
  "유통기한이랑 소비기한 차이가 뭔가요?",
];

/** 키가 없을 때 쓰는 목 답변. 발표에서 물어볼 법한 질문을 덮는다 */
const MOCK_ANSWERS: { match: string[]; text: string; sources: string[] }[] = [
  // 임신·약물 질문은 목록 맨 앞에 둔다. 키워드가 겹칠 때 먼저 잡혀야 한다 —
  // "임산부가 아스파탐 먹어도 되나요" 는 아스파탐 답변이 아니라 이쪽이 맞다.
  // 두 답변 모두 마지막이 전문가 상담으로 끝난다. 건강 앱이 임신·약물 질문에
  // 단정적으로 답하면 그건 기능이 아니라 사고다.
  {
    match: ["임산부", "임신", "수유", "모유"],
    text:
      "관련 연구에서는 권장 섭취량 이내로는 안전한 것으로 보고돼요. 다만 개인차가 있으니 담당 의사와 상담을 권장드려요.\n\n임신 중 특히 신경 쓰이는 건 카페인입니다. 식약처 1일 최대 섭취권고량이 일반 성인 400mg 인데 임산부는 300mg 으로 더 낮게 잡혀 있어요. 커피 한 잔이 대략 75~150mg 입니다.\n\n프로필 설문에서 '임신 중' 을 체크해두시면, 스캔할 때 카페인·아질산나트륨 같은 성분의 위험도를 더 높게 잡아 다시 계산해 드려요.",
    sources: ["식약처 카페인 1일 최대 섭취권고량"],
  },
  {
    // "약" 한 글자는 쓰지 않는다 — 약간·계약·요약을 전부 잡는다
    match: [
      "혈압약", "당뇨약", "약물", "약이랑", "약과", "약 먹", "먹는 약", "약사",
      "복용", "처방", "상호작용", "같이 먹어", "함께 먹어",
    ],
    text:
      "말씀하신 약물과의 상호작용 데이터는 아직 충분하지 않아요. 복용 전 약사님과 확인해보시는 게 안전해요.\n\n저희가 보는 건 식품 성분의 표시·위험도 정보이고, 개별 처방약과의 상호작용은 다루지 않습니다. 같은 성분이라도 약의 종류와 용량에 따라 달라져서 일반적인 답을 드리기 어려워요.\n\n프로필 설문에 복용 중인 약을 적어두시면 관련 성분이 나올 때 눈에 띄게 표시해 드립니다. 판단 자체는 약사님께 맡기시는 게 맞아요.",
    sources: [],
  },
  {
    match: ["아스파탐", "감미료", "제로"],
    text:
      "통상 섭취량에서는 안전한 편입니다.\n\nWHO 산하 IARC 가 2023년 아스파탐을 2B군(발암 가능성 있음)으로 분류했지만, 같은 시점 JECFA 는 1일 섭취허용량(체중 kg당 40mg)을 그대로 유지했습니다. 체중 60kg 기준으로 하루 캔 수십 개 수준이라 일반적인 섭취로는 넘기기 어렵습니다.\n\n다만 페닐케톤뇨증(PKU)이 있다면 피해야 합니다.",
    sources: ["WHO IARC 2023 분류", "JECFA 1일섭취허용량(ADI)"],
  },
  {
    match: ["무설탕", "당류", "당알코올", "말티톨"],
    text:
      "'무설탕' 은 당이 0이라는 뜻이 아닙니다.\n\n식약처 기준으로 100g당 당류 0.5g 미만이면 '무당류' 표시가 가능합니다. 그리고 말티톨·에리스리톨 같은 당알코올은 '당류' 에 포함되지 않아 표시에 안 잡힙니다.\n\n말티톨은 혈당지수가 35 정도로 설탕보다 낮지만 0은 아닙니다. 혈당 관리 중이라면 성분표에서 당알코올 항목을 따로 확인하세요.",
    sources: ["식약처 식품등의 표시기준"],
  },
  {
    match: ["알레르기", "견과", "땅콩", "우유", "달걀"],
    text:
      "표시 대상 알레르기 유발물질은 22종입니다.\n\n우유·달걀·땅콩·견과류·대두·밀·갑각류 등이 포함되고, 이건 원재료명 옆이나 별도 박스에 반드시 표시됩니다.\n\n다만 '같은 시설에서 제조' 같은 교차오염 문구는 의무가 아닙니다. 중증 알레르기가 있다면 제조사에 직접 확인하는 게 가장 확실합니다.\n\n프로필에 알레르기를 등록해두면 스캔할 때 해당 성분을 가장 높은 위험도로 표시해 드려요.",
    sources: ["식약처 알레르기 유발물질 표시 대상 22종"],
  },
  {
    match: ["유통기한", "소비기한"],
    text:
      "유통기한은 '판매 가능 기한', 소비기한은 '먹어도 안전한 기한' 입니다.\n\n소비기한이 더 깁니다. 2023년부터 소비기한 표시제로 전환됐어요.\n\n단, 보관 조건을 지켰을 때 기준입니다. 냉장 제품을 상온에 뒀다면 소비기한 안이라도 안전을 보장하지 않습니다.",
    sources: ["식품 등의 표시·광고에 관한 법률"],
  },
  {
    match: ["MSG", "글루탐산", "조미료"],
    text:
      "현재 과학적 근거로는 통상 섭취량에서 안전하다고 봅니다.\n\nFDA·WHO·식약처 모두 같은 입장입니다. 1968년 '중국음식점 증후군' 보고가 논란의 출발점이었는데, 이후 이중맹검 연구에서 재현되지 않았습니다.\n\n다만 소수는 두통 등을 호소하기도 합니다. 본인이 그렇다면 프로필 기피 성분에 넣어두세요.",
    sources: ["FDA GRAS 목록", "WHO/FAO 합동식품첨가물전문가위원회"],
  },
];

function mockAnswer(q: string): { text: string; sources: string[] } {
  const hit = MOCK_ANSWERS.find((m) => m.match.some((k) => q.includes(k)));
  if (hit) return { text: hit.text, sources: hit.sources };
  return {
    text:
      "이 질문은 아직 검증된 근거를 정리하지 못했습니다.\n\n확인되지 않은 내용을 그럴듯하게 답하는 대신, 모른다고 말씀드리는 편이 낫다고 봅니다. 식약처나 논문에 근거가 확인되면 답변에 반영됩니다.\n\n제품을 스캔하시면 그 제품의 성분에 한해서는 지금 바로 분석해 드릴 수 있어요.",
    sources: [],
  };
}

export default function ChatModal({
  onClose,
  initialQuery,
}: {
  onClose: () => void;
  /** 홈 검색창에서 넘어온 질문 — 열자마자 바로 보낸다 */
  initialQuery?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 열려 있는 동안 뒤 배경 스크롤을 막는다
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 새 메시지가 오면 아래로
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  // 홈 검색창에서 질문을 갖고 들어온 경우 자동 전송
  const firedRef = useRef(false);
  useEffect(() => {
    if (!initialQuery?.trim() || firedRef.current) return;
    firedRef.current = true;
    void send(initialQuery);
    // send 는 매 렌더 새로 만들어지므로 의존성에서 뺀다 (한 번만 실행돼야 한다)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || thinking) return;

    setMessages((m) => [...m, { id: `u${m.length}`, role: "user", text: q }]);
    setInput("");
    setThinking(true);

    let answer = mockAnswer(q);
    try {
      const res = await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) {
        const data = (await res.json()) as { body?: string; explanation?: string; sources?: string[] };
        const body = data.body ?? data.explanation;
        if (body) answer = { text: body, sources: data.sources ?? [] };
      }
    } catch {
      /* 키가 없거나 네트워크 실패 — 목 답변을 그대로 쓴다 */
    }

    setMessages((m) => [
      ...m,
      { id: `b${m.length}`, role: "bot", text: answer.text, sources: answer.sources },
    ]);
    setThinking(false);
    inputRef.current?.focus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AI 에게 물어보기"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
      }}
    >
      <style>{`
        @keyframes chatScrim { from { opacity: 0; } to { opacity: 1; } }
        @keyframes chatPanel { from { transform: translateY(6%); opacity: 0.6; } to { transform: none; opacity: 1; } }
        @keyframes bubbleIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @keyframes dot { 0%,80%,100% { opacity: 0.25; } 40% { opacity: 1; } }
        .chat-scrim { animation: chatScrim 220ms ease-out both; }
        .chat-panel { animation: chatPanel 300ms cubic-bezier(0.32, 0.72, 0, 1) both; }
        .bubble { animation: bubbleIn 260ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .chat-scroll::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .chat-scrim, .chat-panel, .bubble { animation: none; }
        }
      `}</style>

      {/* 흐린 검정 배경 — 탭하면 닫힘 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="chat-scrim"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(10,10,10,0.55)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          border: "none",
          padding: 0,
          minHeight: 0,
          minWidth: 0,
          cursor: "pointer",
        }}
      />

      <div
        className="chat-panel"
        style={{
          position: "relative",
          height: "88dvh",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
          background: CANVAS,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div style={{ padding: "10px 20px 14px", borderBottom: `0.5px solid ${HAIRLINE}`, flexShrink: 0 }}>
          <div aria-hidden="true" style={{ width: 36, height: 4, borderRadius: 2, background: HAIRLINE, margin: "0 auto 14px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: INK,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 72 72" fill="none" aria-hidden="true">
                <rect x="33" y="8" width="6" height="20" rx="1" fill={CANVAS} />
                <rect x="33" y="44" width="6" height="20" rx="1" fill={CANVAS} />
                <rect x="8" y="33" width="20" height="6" rx="1" fill={CANVAS} />
                <rect x="44" y="33" width="20" height="6" rx="1" fill={CANVAS} />
              </svg>
            </span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontFamily: SANS, fontSize: 14, fontWeight: 600, color: INK, letterSpacing: "-0.2px" }}>
                무엇이든 물어보세요
              </span>
              <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "0.5px", marginTop: 1 }}>
                근거가 있는 것만 답합니다
              </span>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              style={{
                background: "transparent",
                border: "none",
                fontSize: 15,
                color: MUTED,
                cursor: "pointer",
                padding: 6,
                minHeight: 0,
                minWidth: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 대화 */}
        <div
          className="chat-scroll"
          style={{ flex: 1, overflowY: "auto", padding: "18px 20px", scrollbarWidth: "none" }}
        >
          {messages.length === 0 && (
            <div style={{ paddingTop: 8 }}>
              <p style={{ fontSize: 14, color: INK, opacity: 0.6, lineHeight: 1.75, marginBottom: 20 }}>
                성분·표시 규정·건강 정보에 대해 물어보세요.
                <br />
                근거가 없으면 없다고 말씀드립니다.
              </p>
              <p style={{ fontFamily: MONO, fontSize: 9, color: MUTED, letterSpacing: "2px", marginBottom: 10 }}>
                이런 걸 물어봐요
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "13px 14px",
                    marginBottom: 7,
                    background: "#FFFFFF",
                    border: `0.5px solid ${HAIRLINE}`,
                    borderRadius: 12,
                    fontFamily: SANS,
                    fontSize: 13,
                    color: INK,
                    cursor: "pointer",
                    touchAction: "manipulation",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="bubble" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                <p
                  style={{
                    maxWidth: "82%",
                    background: INK,
                    color: CANVAS,
                    fontSize: 14,
                    lineHeight: 1.6,
                    borderRadius: "16px 16px 4px 16px",
                    padding: "11px 14px",
                  }}
                >
                  {m.text}
                </p>
              </div>
            ) : (
              <div key={m.id} className="bubble" style={{ marginBottom: 18 }}>
                <div
                  style={{
                    maxWidth: "90%",
                    background: "#FFFFFF",
                    border: `0.5px solid ${HAIRLINE}`,
                    borderRadius: "16px 16px 16px 4px",
                    padding: "13px 15px",
                  }}
                >
                  <p style={{ fontSize: 14, color: INK, lineHeight: 1.7, whiteSpace: "pre-line" }}>{m.text}</p>
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ marginTop: 11, paddingTop: 10, borderTop: `0.5px solid ${HAIRLINE}` }}>
                      <p style={{ fontFamily: MONO, fontSize: 8, color: MUTED, letterSpacing: "1.5px", marginBottom: 5 }}>
                        SOURCES
                      </p>
                      {m.sources.map((s) => (
                        <p key={s} style={{ fontFamily: MONO, fontSize: 9, color: MUTED, lineHeight: 1.7 }}>
                          · {s}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ),
          )}

          {thinking && (
            <div className="bubble" style={{ display: "flex", gap: 4, padding: "13px 15px", width: "fit-content", background: "#FFFFFF", border: `0.5px solid ${HAIRLINE}`, borderRadius: "16px 16px 16px 4px" }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: MUTED,
                    animation: `dot 1.2s ease-in-out ${i * 0.16}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* 입력 — 메신저처럼 하단 고정 */}
        <div
          style={{
            flexShrink: 0,
            display: "flex",
            gap: 8,
            padding: "12px 16px calc(14px + env(safe-area-inset-bottom))",
            borderTop: `0.5px solid ${HAIRLINE}`,
            background: CARD,
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send(input);
            }}
            placeholder="궁금한 걸 물어보세요"
            style={{
              flex: 1,
              padding: "13px 16px",
              background: CANVAS,
              border: `0.5px solid ${HAIRLINE}`,
              borderRadius: 999,
              outline: "none",
              fontFamily: SANS,
              fontSize: 14,
              color: INK,
            }}
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={!input.trim() || thinking}
            aria-label="보내기"
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: "50%",
              background: input.trim() && !thinking ? INK : HAIRLINE,
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: input.trim() && !thinking ? "pointer" : "default",
              touchAction: "manipulation",
              minHeight: 0,
              minWidth: 0,
            }}
          >
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 15V3M9 3L4 8M9 3l5 5" stroke={CANVAS} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
