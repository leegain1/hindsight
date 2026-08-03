"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

import { CATEGORIES as CAT_LIST } from "@/lib/categories";
import { sortMockPosts } from "@/lib/mockCommunity";
import PageHeader from "@/components/PageHeader";

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  ...Object.fromEntries(CAT_LIST.map((c) => [c.slug, { label: c.nameKo, color: c.color }])),
  general: { label: "일반", color: "#8A8880" },
};

interface Post {
  id: string;
  title: string;
  content: string;
  category: string | null;
  likes_count: number;
  comments_count: number;
  fact_check_verdict: string | null;
  fact_check_color: string | null;
  created_at: string;
  profiles: {
    name: string | null;
    email: string | null;
    sensitivity_type: string | null;
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

function PostRow({ post, index }: { post: Post; index: number }) {
  const router = useRouter();
  const author = post.profiles;
  const displayName = author?.name ?? author?.email?.split("@")[0] ?? "익명";
  const catMeta = post.category ? CATEGORY_META[post.category] : null;
  const preview = post.content.slice(0, 80) + (post.content.length > 80 ? "…" : "");

  return (
    <div
      onClick={() => router.push(`/community/${post.id}`)}
      style={{
        paddingTop: index === 0 ? 0 : 24,
        paddingBottom: 24,
        borderBottom: "0.5px solid #D8D4CC",
        cursor: "pointer",
      }}
    >
      {/* Meta row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {catMeta && (
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 7,
            color: catMeta.color,
            letterSpacing: "1.5px",
          }}>
            {catMeta.label.toUpperCase()}
          </span>
        )}
        {post.fact_check_verdict && (
          <>
            <span style={{ color: "#D8D4CC", fontSize: 8 }}>·</span>
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 7,
              color: post.fact_check_color ?? "#8A8880",
              letterSpacing: "1px",
            }}>
              AI · {post.fact_check_verdict}
            </span>
          </>
        )}
      </div>

      {/* Title */}
      <p style={{
        fontSize: 16,
        fontWeight: 400,
        color: "#0A0A0A",
        lineHeight: 1.35,
        letterSpacing: "-0.3px",
        marginBottom: 8,
      }}>
        {post.title}
      </p>

      {/* Preview */}
      <p style={{
        fontSize: 13,
        fontWeight: 300,
        color: "#6A6A68",
        lineHeight: 1.5,
        marginBottom: 12,
        letterSpacing: "-0.1px",
      }}>
        {preview}
      </p>

      {/* Bottom */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880", letterSpacing: "0.5px" }}>
          {displayName}
        </span>
        <span style={{ color: "#D8D4CC", fontSize: 8 }}>·</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>
          {timeAgo(post.created_at)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>
            ♥ {post.likes_count}
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8A8880" }}>
            💬 {post.comments_count}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const router = useRouter();
  const supabase = createClient();
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Supabase 가 없으면 목 데이터로 채운다. 커뮤니티가 텅 비어 있으면
      // "사용자 평판이 쌓인다"는 해자 주장을 화면으로 보여줄 수 없다.
      if (!supabase) {
        setPosts(sortMockPosts(sort) as unknown as Post[]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const orderCol = sort === "popular" ? "likes_count" : "created_at";
      const { data } = await supabase
        .from("community_posts")
        .select(`
          id, title, content, category, likes_count, comments_count,
          fact_check_verdict, fact_check_color, created_at,
          profiles:user_id (name, email, sensitivity_type)
        `)
        .order(orderCol, { ascending: false })
        .limit(30);
      setPosts((data as Post[]) ?? []);
      setLoading(false);
    }
    void load();
  }, [sort, supabase]);

  return (
    <main style={{
      minHeight: "100dvh",
      background: "#F5F2EC",
      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
      paddingBottom: 80,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <PageHeader
        eyebrow="COMMUNITY"
        title="커뮤니티"
        subtitle="성분에 대해 묻고, 근거로 답합니다"
        right={
          <div style={{ display: "flex" }}>
            {(["latest", "popular"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                style={{
                  padding: "6px 10px",
                  background: "none",
                  border: "none",
                  borderBottom: sort === s ? "1px solid #0A0A0A" : "1px solid transparent",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 8,
                  letterSpacing: "1.5px",
                  color: sort === s ? "#0A0A0A" : "#8A8880",
                  cursor: "pointer",
                  minHeight: 0,
                  minWidth: 0,
                }}
              >
                {s === "latest" ? "LATEST" : "POPULAR"}
              </button>
            ))}
          </div>
        }
      />

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 28px" }}>


        {/* Feed */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                paddingTop: i === 0 ? 0 : 24,
                paddingBottom: 24,
                borderBottom: "0.5px solid #D8D4CC",
              }}>
                <div style={{ height: 12, width: "30%", background: "#EDEAE3", borderRadius: 2, marginBottom: 12, animation: "pulse 1.4s ease-in-out infinite" }} />
                <div style={{ height: 18, width: "85%", background: "#EDEAE3", borderRadius: 2, marginBottom: 8, animation: "pulse 1.4s ease-in-out infinite" }} />
                <div style={{ height: 13, width: "60%", background: "#EDEAE3", borderRadius: 2, animation: "pulse 1.4s ease-in-out infinite" }} />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ paddingTop: 60, textAlign: "center" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#8A8880", letterSpacing: "2px", marginBottom: 12 }}>
              NO POSTS YET
            </p>
            <p style={{ fontSize: 14, fontWeight: 300, color: "#8A8880", marginBottom: 32, letterSpacing: "-0.2px" }}>
              첫 번째 글을 써보세요.
            </p>
            <button
              onClick={() => router.push("/community/write")}
              style={{
                padding: "13px 28px",
                background: "#0A0A0A",
                color: "#F5F2EC",
                border: "none",
                borderRadius: 2,
                fontSize: 13,
                fontFamily: "'DM Mono', monospace",
                cursor: "pointer",
                letterSpacing: "1.5px",
              }}
            >
              WRITE
            </button>
          </div>
        ) : (
          <div>
            {posts.map((post, i) => <PostRow key={post.id} post={post} index={i} />)}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/community/write")}
        style={{
          position: "fixed",
          bottom: 88,
          right: 24,
          padding: "12px 20px",
          background: "#0A0A0A",
          border: "none",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          zIndex: 50,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#F5F2EC", letterSpacing: "2px" }}>WRITE</span>
      </button>
    </main>
  );
}
