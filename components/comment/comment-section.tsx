"use client";

import { useState, useTransition } from "react";
import { useUser } from "@/hooks/use-user";
import { useRealtimeComments } from "@/hooks/use-realtime-comments";
import { addComment, deleteComment, likeComment, unlikeComment } from "@/lib/actions/comment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, Trash2, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Comment } from "@/types";
import type { Profile } from "@/types";
import type { LocalUser } from "@/types";
import { toast } from "sonner";
import Link from "next/link";

interface CommentSectionProps {
  photoId: string;
  initialComments: Comment[];
  initialUser?: LocalUser | null;
  initialProfile?: Profile | null;
}

export function CommentSection({
  photoId,
  initialComments,
  initialUser = null,
  initialProfile = null,
}: CommentSectionProps) {
  const { user, profile } = useUser({ initialUser, initialProfile });
  const { comments, addOptimistic, removeOptimistic, updateOptimistic } =
    useRealtimeComments(photoId, initialComments);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const topComments = comments.filter((comment) => !comment.parent_id);
  const replies = comments.filter((comment) => comment.parent_id);

  const getReplies = (commentId: string) =>
    replies.filter((reply) => reply.parent_id === commentId);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim() || !user) return;

    const text = content.trim();
    const optimisticId = `temp-${Date.now()}`;

    addOptimistic({
      id: optimisticId,
      photo_id: photoId,
      user_id: user.id,
      content: text,
      parent_id: replyTo,
      likes: 0,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        username: profile?.username || user.user_metadata?.username || "我",
        avatar_url: profile?.avatar_url || null,
        bio: profile?.bio || null,
        cover_url: profile?.cover_url || null,
        created_at: profile?.created_at || new Date().toISOString(),
      },
    });

    setContent("");
    setReplyTo(null);

    const formData = new FormData();
    formData.set("content", text);
    if (replyTo) formData.set("parent_id", replyTo);

    startTransition(async () => {
      const result = await addComment(photoId, formData);
      if (result.error) {
        removeOptimistic(optimisticId);
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-gray-700" />
        <h3 className="text-lg font-medium text-gray-900">
          评论 ({comments.length})
        </h3>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          {replyTo && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CornerDownRight className="h-3.5 w-3.5" />
              <span>回复评论</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                取消
              </button>
            </div>
          )}
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="写下你的评论..."
            rows={3}
            className="resize-none bg-gray-50 border-gray-200 focus:bg-white"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
              {isPending ? "发送中..." : replyTo ? "发送回复" : "发表评论"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500">
            <Link href="/login" className="text-gray-900 font-medium hover:underline">
              登录
            </Link>
            {" 后参与评论"}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {topComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            replies={getReplies(comment.id)}
            photoId={photoId}
            userId={user?.id}
            onReply={() => setReplyTo(comment.id)}

          />
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-center text-sm text-gray-400 py-8">
          还没有评论，来发表第一条吧
        </p>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  replies,
  photoId,
  userId,
  onReply,
}: {
  comment: Comment;
  replies: Comment[];
  photoId: string;
  userId?: string;
  onReply: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const isOptimistic = comment.id.startsWith("temp-");
  const [localLikes, setLocalLikes] = useState(comment.likes);
  const [localLiked, setLocalLiked] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteComment(comment.id, photoId);
      if (result.error) toast.error(result.error);
    });
  };

  const handleLike = () => {
    if (localLiked) {
      setLocalLikes((v) => Math.max(0, v - 1));
      setLocalLiked(false);
      startTransition(async () => {
        const result = await unlikeComment(comment.id, photoId);
        if (result.error) {
          setLocalLikes((v) => v + 1);
          setLocalLiked(true);
          toast.error(result.error);
        }
      });
    } else {
      setLocalLikes((v) => v + 1);
      setLocalLiked(true);
      startTransition(async () => {
        const result = await likeComment(comment.id, photoId);
        if (result.error) {
          setLocalLikes((v) => Math.max(0, v - 1));
          setLocalLiked(false);
          toast.error(result.error);
        }
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0 overflow-hidden">
          {comment.profiles?.avatar_url ? (
            <AvatarImage
              src={comment.profiles.avatar_url}
              alt={comment.profiles?.username || "头像"}
            />
          ) : null}
          <AvatarFallback className="bg-gray-100 text-gray-600 text-xs">
            {(comment.profiles?.username || "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">
              {comment.profiles?.username || "匿名"}
            </span>
            <span className="text-xs text-gray-400">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>
          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap break-words">
            {comment.content}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleLike}
              disabled={isPending || isOptimistic}
              className={`flex items-center gap-1 text-xs transition-colors disabled:opacity-50 ${localLiked ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}
            >
              <Heart className={`h-3.5 w-3.5 ${localLiked ? "fill-current" : ""}`} />
              {localLikes > 0 && <span>{localLikes}</span>}
            </button>
            <button
              type="button"
              onClick={onReply}
              disabled={isOptimistic}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              回复
            </button>
            {userId === comment.user_id && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending || isOptimistic}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-gray-100 pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar className="h-6 w-6 shrink-0 overflow-hidden">
                {reply.profiles?.avatar_url ? (
                  <AvatarImage
                    src={reply.profiles.avatar_url}
                    alt={reply.profiles?.username || "头像"}
                  />
                ) : null}
                <AvatarFallback className="bg-gray-100 text-gray-600 text-[10px]">
                  {(reply.profiles?.username || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {reply.profiles?.username || "匿名"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(reply.created_at), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap break-words">
                  {reply.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
