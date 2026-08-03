"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { getMockPost } from "@/lib/mockCommunity";

const SENSITIVITY_BADGES: Record<string, { label: string; color: string }> = {
  beginner:      { label: "입문자",    color: "#8A7A2A" },
  selective:     { label: "선택적",    color: "#2A8A5C" },
  comprehensive: { label: "종합관리",  color: "#3B7DD4" },
  expert:        { label: "전문가",    color: "#6B52D4" },
};

import { CATEGORIES as CAT_LIST } from "@/lib/categories";

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  ...Object.fromEntries(CAT_LIST.map((c) => [c.slug, { label: c.nameKo, color: c.color }])),
  general: { label: "일반", color: "#8A8880" },
};

interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string | null;
  likes_count: number;
  comments_count: number;
  fact_check_verdict: string | null;
  fact_check_color: string | null;
  fact_check_explanation: string | null;
  product_barcode: string | null;
  product_name: string | null;
  created_at: string;
  profiles: {
    name: string | null;
    email: string | null;
    sensitivity_type: string | null;
  } | null;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    name: string | null;
    email: string | null;
  } | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}

function getInitials(name: string | null, email: string | null): string {
  if (name) return name.slice(0, 2).toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Load post + comments + auth state
  useEffect(() => {
    async function load() {
      // Supabase 가 없으면 목 데이터에서 찾는다 (목록도 같은 소스를 쓴다)
      if (!supabase) {
        const mock = getMockPost(String(id));
        if (mock) {
          setPost({
            ...mock,
            user_id: "mock",
            fact_check_explanation: null,
            product_barcode: null,
            product_name: null,
            profiles: { ...mock.profiles, email: null },
          } as unknown as Post);
          setLikeCount(mock.likes_count);
          setComments(
            mock.comments.map((c) => ({
              id: c.id,
              post_id: mock.id,
              user_id: "mock",
              content: c.body,
              created_at: c.createdAt,
              profiles: { name: c.author.name, email: null },
            })),
          );
        }
        setLoading(false);
        return;
      }
      const [postRes, commentsRes, authRes] = await Promise.all([
        supabase
          .from("community_posts")
          .select(`
            id, user_id, title, content, category, likes_count, comments_count,
            fact_check_verdict, fact_check_color, fact_check_explanation,
            product_barcode, product_name, created_at,
            profiles:user_id (name, email, sensitivity_type)
          `)
          .eq("id", id)
          .single(),
        supabase
          .from("community_comments")
          .select(`
            id, post_id, user_id, content, created_at,
            profiles:user_id (name, email)
          `)
          .eq("post_id", id)
          .order("created_at", { ascending: true }),
        supabase.auth.getUser(),
      ]);

      if (postRes.data) {
        setPost(postRes.data as Post);
        setLikeCount((postRes.data as Post).likes_count);
      }
      setComments((commentsRes.data as Comment[]) ?? []);

      if (authRes.data.user) {
        setUserId(authRes.data.user.id);
        // Check if user has liked
        const likeRes = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", id)
          .eq("user_id", authRes.data.user.id)
          .single();
        setLiked(!!likeRes.data);
      }

      setLoading(false);
    }
    void load();
  }, [id, supabase]);

  // Realtime comments subscription
  useEffect(() => {
    // Supabase 미설정이면 구독할 대상이 없다 — null 에 .channel() 을 부르면 터진다
    if (!supabase) return;
    const channel = supabase
      .channel(`post-${id}-comments`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_comments", filter: `post_id=eq.${id}` },
        async (payload: { new: { id: string } }) => {
          // Fetch comment with profile
          const { data } = await supabase
            .from("community_comments")
            .select("id, post_id, user_id, content, created_at, profiles:user_id (name, email)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setComments((prev) => {
              const exists = prev.some((c) => c.id === (data as Comment).id);
              return exists ? prev : [...prev, data as Comment];
            });
          }
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [id, supabase]);

  const handleLike = async () => {
    if (!userId) { router.push("/auth/login?next=/community/" + id); return; }
    if (liked) {
      await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", userId);
      setLiked(false);
      setLikeCount((n) => Math.max(0, n - 1));
    } else {
      await supabase.from("post_likes").insert({ post_id: id, user_id: userId });
      setLiked(true);
      setLikeCount((n) => n + 1);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    if (!userId) { router.push("/auth/login?next=/community/" + id); return; }
    setSubmittingComment(true);
    await supabase.from("community_comments").insert({
      post_id: id,
      user_id: userId,
      content: commentText.trim(),
    });
    setCommentText("");
    setSubmittingComment(false);
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
  };

  const handleDelete = async () => {
    if (!post || post.user_id !== userId) return;
    if (!confirm("이 글을 삭제하시겠어요?")) return;
    setDeleting(true);
    await supabase.from("community_posts").delete().eq("id", id);
    router.replace("/community");
  };

  const handleShare = () => {
    if (navigator.share) {
      void navigator.share({ title: post?.title ?? "", url: window.location.href });
    } else {
      void navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100dvh", background: "#F5F2EC", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="spin" style={{ width: 24, height: 24, border: "2px solid #D8D4CC", borderTopColor: "#0A0A0A", borderRadius: "50%", }} />
      </main>
    );
  }

  if (!post) {
    return (
      <main style={{ minHeight: "100dvh", background: "#F5F2EC", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "1.5px" }}>POST NOT FOUND</p>
        <button onClick={() => router.push("/community")} style={{ padding: "10px 20px", background: "#0A0A0A", color: "#F5F2EC", border: "none", borderRadius: 10, fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", cursor: "pointer" }}>
          커뮤니티로 돌아가기
        </button>
      </main>
    );
  }

  const author = post.profiles;
  const displayName = author?.name ?? author?.email?.split("@")[0] ?? "익명";
  const initials = getInitials(author?.name ?? null, author?.email ?? null);
  const sensBadge = author?.sensitivity_type ? SENSITIVITY_BADGES[author.sensitivity_type] : null;
  const catMeta = post.category ? CATEGORY_META[post.category] : null;

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F2EC",
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      paddingBottom: 80,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <header style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "calc(20px + env(safe-area-inset-top)) 24px 20px",
        borderBottom: "0.5px solid #D8D4CC",
        position: "sticky",
        top: 0,
        background: "#F5F2EC",
        zIndex: 20,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: "0 8px", minHeight: 44 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="#0A0A0A" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "1px", color: "#8A8880" }}>BACK</span>
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleShare} style={{ background: "none", border: "0.5px solid #D8D4CC", borderRadius: 8, padding: "7px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="10.5" cy="2.5" r="1.5" stroke="#8A8880" strokeWidth="1" />
              <circle cx="2.5" cy="6.5" r="1.5" stroke="#8A8880" strokeWidth="1" />
              <circle cx="10.5" cy="10.5" r="1.5" stroke="#8A8880" strokeWidth="1" />
              <path d="M4 5.5L9 3.5M4 7.5L9 9.5" stroke="#8A8880" strokeWidth="1" strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>SHARE</span>
          </button>
          {post.user_id === userId && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ background: "none", border: "0.5px solid rgba(196,75,75,0.3)", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#C44B4B", letterSpacing: "0.5px" }}
            >
              {deleting ? "..." : "DELETE"}
            </button>
          )}
        </div>
      </header>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 20px 0", animation: "fadeUp var(--dur-reveal) var(--ease-out-quint) both" }}>

        {/* Author */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#F5F2EC", fontWeight: 500 }}>{initials}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 400, color: "#0A0A0A" }}>{displayName}</span>
              {sensBadge && (
                <span style={{ fontSize: 8, padding: "2px 7px", borderRadius: 10, background: `${sensBadge.color}18`, border: `0.5px solid ${sensBadge.color}40`, color: sensBadge.color, fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px" }}>
                  {sensBadge.label}
                </span>
              )}
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>{timeAgo(post.created_at)}</span>
          </div>
          {catMeta && (
            <span style={{ fontSize: 8, padding: "3px 9px", borderRadius: 10, background: `${catMeta.color}15`, border: `0.5px solid ${catMeta.color}35`, color: catMeta.color, fontFamily: "'DM Mono', monospace", letterSpacing: "0.5px", flexShrink: 0 }}>
              {catMeta.label}
            </span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 20, fontWeight: 500, color: "#0A0A0A", lineHeight: 1.4, marginBottom: 14, letterSpacing: "-0.2px" }}>
          {post.title}
        </h1>

        {/* Fact-check badge */}
        {post.fact_check_verdict && (
          <div style={{
            background: `${post.fact_check_color ?? "#8A8880"}10`,
            border: `0.5px solid ${post.fact_check_color ?? "#8A8880"}30`,
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 14,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880", letterSpacing: "1px" }}>AI FACT CHECK</span>
              <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: `${post.fact_check_color ?? "#8A8880"}20`, border: `0.5px solid ${post.fact_check_color ?? "#8A8880"}40`, color: post.fact_check_color ?? "#8A8880", fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>
                {post.fact_check_verdict}
              </span>
            </div>
            {post.fact_check_explanation && (
              <p style={{ fontSize: 12, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.55 }}>{post.fact_check_explanation}</p>
            )}
          </div>
        )}

        {/* Content */}
        <p style={{ fontSize: 14, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.7, marginBottom: 20, whiteSpace: "pre-wrap" }}>
          {post.content}
        </p>

        {/* Tagged product */}
        {post.product_name && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "1.5px", marginBottom: 8 }}>TAGGED PRODUCT</p>
            {post.product_barcode ? (
              <Link href={`/scan/result/${encodeURIComponent(post.product_barcode)}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: "#0A0A0A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="14" height="14" viewBox="0 0 72 72" fill="none">
                      <rect x="33" y="8" width="6" height="20" rx="1" fill="#F5F2EC" />
                      <rect x="33" y="44" width="6" height="20" rx="1" fill="#F5F2EC" />
                      <rect x="8" y="33" width="20" height="6" rx="1" fill="#F5F2EC" />
                      <rect x="44" y="33" width="20" height="6" rx="1" fill="#F5F2EC" />
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 400, color: "#0A0A0A", marginBottom: 2 }}>{post.product_name}</p>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>{post.product_barcode}</p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 2L9 6L3 10" stroke="#8A8880" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
              </Link>
            ) : (
              <div style={{ background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "12px 14px" }}>
                <p style={{ fontSize: 13, fontWeight: 400, color: "#0A0A0A" }}>{post.product_name}</p>
              </div>
            )}
          </div>
        )}

        {/* Like button */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderTop: "0.5px solid #D8D4CC", borderBottom: "0.5px solid #D8D4CC", marginBottom: 24 }}>
          <button
            className="state-swap"
            onClick={handleLike}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: liked ? "#0A0A0A" : "#EDEAE3",
              border: `0.5px solid ${liked ? "#0A0A0A" : "#D8D4CC"}`,
              borderRadius: 20,
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 12.5S1 8.5 1 4.5C1 3 2.5 1.5 4.5 1.5c1 0 2 .5 2.5 1.3C7.5 2 8.5 1.5 9.5 1.5c2 0 3.5 1.5 3.5 3 0 4-6 8-6 8z"
                fill={liked ? "#F5F2EC" : "none"}
                stroke={liked ? "#F5F2EC" : "#8A8880"}
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: liked ? "#F5F2EC" : "#8A8880", letterSpacing: "0.5px" }}>
              {likeCount}
            </span>
          </button>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "1px" }}>
            {comments.length}개의 댓글
          </span>
        </div>

        {/* Comments */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "1.5px", marginBottom: 12 }}>
            COMMENTS
          </p>

          {comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#D8D4CC", letterSpacing: "1px" }}>
                첫 번째 댓글을 남겨보세요
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {comments.map((c) => {
                const cName = c.profiles?.name ?? c.profiles?.email?.split("@")[0] ?? "익명";
                const cInit = getInitials(c.profiles?.name ?? null, c.profiles?.email ?? null);
                return (
                  <div key={c.id} style={{ display: "flex", gap: 10, animation: "fadeUp var(--dur-state) var(--ease-out-quint) both" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#EDEAE3", border: "0.5px solid #D8D4CC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880" }}>{cInit}</span>
                    </div>
                    <div style={{ flex: 1, background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 12, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 400, color: "#0A0A0A" }}>{cName}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#8A8880" }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 300, color: "#0A0A0A", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={commentsEndRef} />
        </div>
      </div>

      {/* Fixed comment input */}
      <div style={{
        position: "fixed",
        bottom: 64,
        left: 0,
        right: 0,
        background: "#F5F2EC",
        borderTop: "0.5px solid #D8D4CC",
        padding: "10px 16px",
        display: "flex",
        gap: 8,
        zIndex: 30,
      }}>
        <div style={{ flex: 1, background: "#EDEAE3", border: "0.5px solid #D8D4CC", borderRadius: 20, padding: "10px 14px" }}>
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleComment(); } }}
            placeholder={userId ? "댓글 달기..." : "로그인 후 댓글 달기"}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 13,
              fontWeight: 300,
              color: "#0A0A0A",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          />
        </div>
        <button
          className="state-swap"
          onClick={handleComment}
          disabled={!commentText.trim() || submittingComment}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: commentText.trim() ? "#0A0A0A" : "#EDEAE3",
            border: "0.5px solid #D8D4CC",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: commentText.trim() ? "pointer" : "default",
            flexShrink: 0,
          }}
        >
          {submittingComment ? (
            <div className="spin" style={{ width: 12, height: 12, border: "1.5px solid rgba(245,242,236,0.4)", borderTopColor: "#F5F2EC", borderRadius: "50%", }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7H13M13 7L7 1M13 7L7 13" stroke={commentText.trim() ? "#F5F2EC" : "#8A8880"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </main>
  );
}
