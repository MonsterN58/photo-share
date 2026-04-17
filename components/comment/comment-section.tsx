"use client";

import { useState, useTransition } from "react";
import { useUser } from "@/hooks/use-user";
import { useRealtimeComments } from "@/hooks/use-realtime-comments";
import { addComment, deleteComment, likeComment } from "@/lib/actions/comment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, MessageCircle, Trash2, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Comment } from "@/types";
import { toast } from "sonner";
import Link from "next/link";

interface CommentSectionProps {
  photoId: string;
  initialComments: Comment[];
}

export function CommentSection({ photoId, initialComments }: CommentSectionProps) {
  const { user } = useUser();
  const comments = useRealtimeComments(photoId, initialComments);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 分离顶级评论和回复
  const topComments = comments.filter((c) => !c.parent_id);
  const replies = comments.filter((c) => c.parent_id);

  const getReplies = (commentId: string) =>
    replies.filter((r) => r.parent_id === commentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const formData = new FormData();
    formData.set("content", content.trim());
    if (replyTo) formData.set("parent_id", replyTo);

    startTransition(async () => {
      const result = await addComment(photoId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        setContent("");
        setReplyTo(null);
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

      {/* 评论输入 */}
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
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你的评论..."
            rows={3}
            className="resize-none bg-gray-50 border-gray-200 focus:bg-white"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
              {isPending ? "发送中..." : "发表评论"}
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

      {/* 评论列表 */}
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

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteComment(comment.id, photoId);
      if (result.error) toast.error(result.error);
    });
  };

  const handleLike = () => {
    startTransition(async () => {
      const result = await likeComment(comment.id, photoId);
      if (result.error) toast.error(result.error);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
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
              onClick={handleLike}
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <Heart className="h-3.5 w-3.5" />
              {comment.likes > 0 && <span>{comment.likes}</span>}
            </button>
            <button
              onClick={onReply}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              回复
            </button>
            {userId === comment.user_id && (
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 回复 */}
      {replies.length > 0 && (
        <div className="ml-11 space-y-3 border-l-2 border-gray-100 pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar className="h-6 w-6 shrink-0">
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
