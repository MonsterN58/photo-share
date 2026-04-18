"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Album as AlbumIcon,
  ArrowLeft,
  Camera,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FolderPlus,
  Heart,
  ImageIcon,
  Images,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  BookImage,
} from "lucide-react";
import { toast } from "sonner";
import { deletePhoto, deletePhotos, updatePhoto } from "@/lib/actions/photo";
import { assignPhotosToAlbum, createAlbum, deleteAlbum } from "@/lib/actions/album";
import { publishPortfolio, updatePortfolioCover } from "@/lib/actions/portfolio";
import { uploadAvatar, uploadCover, updateProfileInfo } from "@/lib/actions/profile";
import { ShareButton } from "@/components/photo/share-button";
import { CoverCollage } from "@/components/photo/cover-collage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useBoxSelect } from "@/hooks/use-box-select";
import { parseCoverUrls, serializeCoverUrls } from "@/lib/cover";
import { shouldBypassImageOptimization } from "@/lib/image-url";
import type { Album, Photo, Portfolio, Profile } from "@/types";

type View =
  | { kind: "all-photos" }
  | { kind: "album-photos"; albumId: string; albumName: string };

type PersonalGalleryItem =
  | { type: "album"; album: Album; photos: Photo[] }
  | { type: "photo"; photo: Photo };

interface MyPhotosClientProps {
  photos: Photo[];
  albums: Album[];
  profile: Profile | null;
  portfolios?: Portfolio[];
}

export function MyPhotosClient({
  photos: initialPhotos,
  albums: initialAlbums,
  profile: initialProfile,
  portfolios: initialPortfolios = [],
}: MyPhotosClientProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [albums, setAlbums] = useState(initialAlbums);
  const [portfolios, setPortfolios] = useState<Portfolio[]>(initialPortfolios);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile?.avatar_url ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [view, setView] = useState<View>({ kind: "all-photos" });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggingPhotoId, setDraggingPhotoId] = useState<string | null>(null);
  const [dropAlbumId, setDropAlbumId] = useState<string | null>(null);
  const [dropPhotoId, setDropPhotoId] = useState<string | null>(null);
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [pendingPhotoIds, setPendingPhotoIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const gridRef = useRef<HTMLDivElement>(null);

  // Box-selection support
  const onBoxSelectionChange = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const { selectionRect } = useBoxSelect({
    containerRef: gridRef,
    itemSelector: "[data-photo-id]",
    idAttribute: "data-photo-id",
    onSelectionChange: onBoxSelectionChange,
    enabled: view.kind === "all-photos",
  });

  const visiblePhotos = useMemo(() => {
    if (view.kind === "all-photos") return photos;
    return photos.filter((photo) => photo.album_id === view.albumId);
  }, [photos, view]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allVisibleSelected =
    visiblePhotos.length > 0 && visiblePhotos.every((photo) => selectedSet.has(photo.id));

  const galleryItems = useMemo<PersonalGalleryItem[]>(() => {
    const albumItems = albums
      .map((album) => ({
        type: "album" as const,
        album,
        photos: photos.filter((photo) => photo.album_id === album.id),
      }))
      .filter((item) => item.photos.length > 0);

    const loosePhotoItems = photos
      .filter((photo) => !photo.album_id)
      .map((photo) => ({ type: "photo" as const, photo }));

    return [...albumItems, ...loosePhotoItems];
  }, [albums, photos]);

  const movePhotos = (photoIds: string[], albumId: string | null, successMessage?: string) => {
    startTransition(async () => {
      const result = await assignPhotosToAlbum(photoIds, albumId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPhotos((prev) =>
          prev.map((photo) =>
            photoIds.includes(photo.id)
              ? {
                  ...photo,
                  album_id: albumId,
                  albums: albums.find((album) => album.id === albumId) || null,
                }
              : photo
          )
        );
        setSelectedIds((prev) => prev.filter((id) => !photoIds.includes(id)));
        toast.success(
          successMessage ||
            (albumId ? `已移入相册${photoIds.length > 1 ? `（${photoIds.length} 张）` : ""}` : "已移出相册")
        );
        router.refresh();
      }
      setDraggingPhotoId(null);
      setDropAlbumId(null);
    });
  };

  const togglePhoto = (photoId: string) => {
    setSelectedIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const toggleSelectAll = () => {
    const visibleIds = visiblePhotos.map((photo) => photo.id);
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleAlbumSelection = (albumPhotos: Photo[]) => {
    const albumPhotoIds = albumPhotos.map((photo) => photo.id);
    const allSelected = albumPhotoIds.every((id) => selectedSet.has(id));

    setSelectedIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !albumPhotoIds.includes(id));
      }
      return Array.from(new Set([...prev, ...albumPhotoIds]));
    });
  };

  const handleDelete = (photoId: string) => {
    if (!confirm("确定要删除这张照片吗？")) return;

    startTransition(async () => {
      const result = await deletePhoto(photoId);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      setSelectedIds((prev) => prev.filter((id) => id !== photoId));
      toast.success("删除成功");
      router.refresh();
    });
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.length} 张照片吗？`)) return;

    const ids = [...selectedIds];
    startTransition(async () => {
      const result = await deletePhotos(ids);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setPhotos((prev) => prev.filter((photo) => !ids.includes(photo.id)));
      setSelectedIds([]);
      toast.success(`已删除 ${ids.length} 张照片`);
      router.refresh();
    });
  };

  const handleUpdate = (photoId: string, formData: FormData) => {
    startTransition(async () => {
      const result = await updatePhoto(photoId, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      setPhotos((prev) =>
        prev.map((photo) =>
          photo.id === photoId
            ? {
                ...photo,
                title: String(formData.get("title") || ""),
                description: String(formData.get("description") || "") || null,
                is_public: formData.get("is_public") === "true",
                allow_download: formData.get("allow_download") === "true",
              }
            : photo
        )
      );
      toast.success("更新成功");
    });
  };

  const handleCreateAlbum = (formData: FormData, onDone: () => void) => {
    startTransition(async () => {
      const result = await createAlbum(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (!result.album) return;

      const newAlbum = result.album as Album;
      setAlbums((prev) => [newAlbum, ...prev]);

      if (pendingPhotoIds.length > 0) {
        const ids = [...pendingPhotoIds];
        setPendingPhotoIds([]);
        const assignResult = await assignPhotosToAlbum(ids, newAlbum.id);
        if (!assignResult.error) {
          setPhotos((prev) =>
            prev.map((photo) =>
              ids.includes(photo.id)
                ? { ...photo, album_id: newAlbum.id, albums: newAlbum }
                : photo
            )
          );
          toast.success(`已创建相册并将 ${ids.length} 张照片加入其中`);
        } else {
          toast.success("相册已创建");
          toast.error(assignResult.error);
        }
      } else {
        toast.success("相册已创建");
      }
      onDone();
      router.refresh();
    });
  };

  const handleDeleteAlbum = (albumId: string, albumName: string) => {
    if (!confirm(`确定要删除相册"${albumName}"吗？相册中的照片不会被删除。`)) return;
    startTransition(async () => {
      const result = await deleteAlbum(albumId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
      setPhotos((prev) =>
        prev.map((photo) => (photo.album_id === albumId ? { ...photo, album_id: null, albums: null } : photo))
      );
      toast.success(`相册"${albumName}"已删除`);
      router.refresh();
    });
  };

  const handlePublishPortfolio = (albumId: string, albumName: string) => {
    const coverUrls = getDefaultAlbumCoverPhotos(photos.filter((p) => p.album_id === albumId)).map((photo) => photo.url);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("album_id", albumId);
      formData.set("title", albumName);
      formData.set("description", "");
      formData.set("cover_url", serializeCoverUrls(coverUrls));
      formData.set("is_public", "true");
      const result = await publishPortfolio(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`相册「${albumName}」已发布为作品集`);
        router.refresh();
      }
    });
  };

  const handleDropToCreateAlbum = (draggedPhotoId: string, targetPhotoId: string) => {
    if (draggedPhotoId === targetPhotoId) return;
    setPendingPhotoIds([draggedPhotoId, targetPhotoId]);
    setCreateAlbumOpen(true);
    setDraggingPhotoId(null);
    setDropPhotoId(null);
  };

  const handleAssignAlbum = (albumId: string | null) => {
    if (selectedIds.length === 0) {
      toast.error("请先选择照片");
      return;
    }
    movePhotos([...selectedIds], albumId);
  };

  const handleDropToAlbum = (photoId: string, albumId: string) => {
    const draggedPhoto = photos.find((photo) => photo.id === photoId);
    if (!draggedPhoto || draggedPhoto.album_id === albumId) {
      setDraggingPhotoId(null);
      setDropAlbumId(null);
      return;
    }

    const ids = selectedSet.has(photoId) ? [...selectedIds] : [photoId];
    movePhotos(ids, albumId, ids.length > 1 ? `已将 ${ids.length} 张照片拖入相册` : "已拖入相册");
  };

  // Touch drag handlers for mobile
  const handleTouchHover = useCallback((x: number, y: number) => {
    const target = document.elementFromPoint(x, y);
    const albumEl = target?.closest("[data-album-id]");
    const photoEl = target?.closest("[data-photo-id]");
    if (albumEl) {
      const albumId = albumEl.getAttribute("data-album-id");
      if (albumId) {
        setDropAlbumId(albumId);
        setDropPhotoId(null);
      }
    } else if (photoEl) {
      const targetId = photoEl.getAttribute("data-photo-id");
      if (targetId) {
        setDropPhotoId(targetId);
        setDropAlbumId(null);
      }
    } else {
      setDropPhotoId(null);
      setDropAlbumId(null);
    }
  }, []);

  const handleTouchDrop = useCallback((photoId: string, x: number, y: number) => {
    const target = document.elementFromPoint(x, y);
    const albumEl = target?.closest("[data-album-id]");
    const photoEl = target?.closest("[data-photo-id]");
    if (albumEl) {
      const albumId = albumEl.getAttribute("data-album-id");
      if (albumId) handleDropToAlbum(photoId, albumId);
    } else if (photoEl) {
      const targetId = photoEl.getAttribute("data-photo-id");
      if (targetId && targetId !== photoId) handleDropToCreateAlbum(photoId, targetId);
    }
    setDraggingPhotoId(null);
    setDropAlbumId(null);
    setDropPhotoId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, selectedIds, albums]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const formData = new FormData();
    formData.set("avatar", file);
    const result = await uploadAvatar(formData);
    setAvatarUploading(false);
    if (result.error) {
      toast.error(result.error);
    } else if (result.url) {
      setAvatarUrl(result.url);
      // Update avatar in locally-cached photo profiles so cards reflect the change instantly
      setPhotos((prev) =>
        prev.map((p) =>
          p.profiles
            ? { ...p, profiles: { ...p.profiles, avatar_url: result.url! } }
            : p
        )
      );
      window.dispatchEvent(new Event("profile-updated"));
      router.refresh();
      toast.success("头像已更新");
    }
    event.target.value = "";
  };

  const isAlbumView = view.kind === "album-photos";
  const viewTitle = isAlbumView ? view.albumName : "我的照片";

  return (
    <div className="space-y-5">
      {/* Profile header */}
      <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4">
        <label className="relative cursor-pointer shrink-0 group/av">
          <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-200 ring-2 ring-gray-100">
            {avatarUploading ? (
              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : avatarUrl ? (
              <Image src={avatarUrl} alt="头像" width={64} height={64} className="object-cover h-full w-full" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-gray-800 text-white text-xl font-bold">
                {(initialProfile?.username || "U").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/0 group-hover/av:bg-black/35 transition-all flex items-center justify-center">
            <Camera className="h-5 w-5 text-white opacity-0 group-hover/av:opacity-100 transition-opacity" />
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
        </label>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">{initialProfile?.username || "我的主页"}</h1>
            <Link href={`/user/${initialProfile?.id}`}>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-400 hover:text-gray-700 text-xs gap-1">
                <ExternalLink className="h-3 w-3" />
                查看主页
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {albums.length} 个相册 · {photos.length} 张照片
          </p>
          <p className="text-xs text-gray-400 mt-1">点击头像可更换</p>
        </div>
        <EditProfileDialog profile={initialProfile} />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {isAlbumView ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-gray-500 hover:text-gray-900"
                onClick={() => {
                  setView({ kind: "all-photos" });
                  setSelectedIds([]);
                }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                我的照片
              </Button>
              <span className="text-gray-300">/</span>
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Images className="h-4 w-4" />
              <span className="hidden sm:inline">拖动照片到相册或框选多张，拖向另一张可创建新相册</span>
              <span className="sm:hidden">长按照片拖动到相册，或拖向另一张创建新相册</span>
            </div>
          )}
          <span className="text-sm font-medium text-gray-800">{viewTitle}</span>
          <span className="text-xs text-gray-400">({visiblePhotos.length} 张)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAlbumView && (
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              <Check className="h-3.5 w-3.5" />
              {allVisibleSelected ? "取消全选" : "全选"}
            </Button>
          )}
          {selectedIds.length > 0 && (
            <>
              <span className="text-sm text-gray-500">已选 {selectedIds.length} 张</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                批量删除
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      className="min-w-32 justify-between text-gray-700"
                    />
                  }
                >
                  移动到相册
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  <DropdownMenuItem onClick={() => handleAssignAlbum(null)}>
                    移出相册
                  </DropdownMenuItem>
                  {albums.map((album) => (
                    <DropdownMenuItem
                      key={album.id}
                      onClick={() => handleAssignAlbum(album.id)}
                    >
                      {album.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          <CreateAlbumDialog
            onCreate={handleCreateAlbum}
            disabled={isPending}
            open={createAlbumOpen}
            onOpenChange={(open) => {
              setCreateAlbumOpen(open);
              if (!open) setPendingPhotoIds([]);
            }}
          />
        </div>
      </div>

      {visiblePhotos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <AlbumIcon className="mx-auto mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-400">
            {isAlbumView ? "这个相册还没有照片" : "还没有上传照片"}
          </p>
          {!isAlbumView && (
            <Link href="/upload">
              <Button className="mt-4" size="sm">
                上传第一张
              </Button>
            </Link>
          )}
        </div>
      ) : isAlbumView ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visiblePhotos.map((photo) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              compact={false}
              selected={selectedSet.has(photo.id)}
              isDragging={draggingPhotoId === photo.id}
              isPending={isPending}
              onToggle={() => togglePhoto(photo.id)}
              onDelete={() => handleDelete(photo.id)}
              onSave={handleUpdate}
              onDragStart={(photoId) => {
                setDraggingPhotoId(photoId);
                setDropAlbumId(null);
              }}
              onDragEnd={() => {
                setDraggingPhotoId(null);
                setDropAlbumId(null);
              }}
            />
          ))}
        </div>
      ) : (
        <div ref={gridRef} className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 select-none">
          {selectionRect && (
            <div
              className="absolute z-30 border-2 border-blue-400 bg-blue-400/10 rounded pointer-events-none"
              style={{
                left: selectionRect.x,
                top: selectionRect.y,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
            />
          )}
          {galleryItems.map((item) =>
            item.type === "album" ? (
              <AlbumCollectionTile
                key={item.album.id}
                album={item.album}
                photos={item.photos}
                selectedCount={item.photos.filter((photo) => selectedSet.has(photo.id)).length}
                isDropTarget={dropAlbumId === item.album.id}
                canDrop={Boolean(draggingPhotoId)}
                isPending={isPending}
                portfolio={portfolios.find((p) => p.album_id === item.album.id)}
                onOpen={() =>
                  setView({
                    kind: "album-photos",
                    albumId: item.album.id,
                    albumName: item.album.name,
                  })
                }
                onToggle={() => toggleAlbumSelection(item.photos)}
                onDelete={() => handleDeleteAlbum(item.album.id, item.album.name)}
                onPublish={() => handlePublishPortfolio(item.album.id, item.album.name)}
                onCoverChanged={(portfolioId, coverUrl) =>
                  setPortfolios((prev) =>
                    prev.map((p) => (p.id === portfolioId ? { ...p, cover_url: coverUrl } : p))
                  )
                }
                onDragEnter={() => setDropAlbumId(item.album.id)}
                onDragLeave={() =>
                  setDropAlbumId((current) => (current === item.album.id ? null : current))
                }
                onDropPhoto={(photoId) => handleDropToAlbum(photoId, item.album.id)}
              />
            ) : (
              <PhotoTile
                key={item.photo.id}
                photo={item.photo}
                compact
                selected={selectedSet.has(item.photo.id)}
                isDragging={draggingPhotoId === item.photo.id}
                isPhotoDropTarget={dropPhotoId === item.photo.id}
                canDropForAlbum={Boolean(draggingPhotoId) && draggingPhotoId !== item.photo.id}
                isPending={isPending}
                onToggle={() => togglePhoto(item.photo.id)}
                onDelete={() => handleDelete(item.photo.id)}
                onSave={handleUpdate}
                onDragStart={(photoId) => {
                  setDraggingPhotoId(photoId);
                  setDropAlbumId(null);
                  setDropPhotoId(null);
                }}
                onDragEnd={() => {
                  setDraggingPhotoId(null);
                  setDropAlbumId(null);
                  setDropPhotoId(null);
                }}
                onDragEnterForAlbum={() => setDropPhotoId(item.photo.id)}
                onDragLeaveForAlbum={() =>
                  setDropPhotoId((cur) => (cur === item.photo.id ? null : cur))
                }
                onDropForAlbum={(draggedPhotoId) =>
                  handleDropToCreateAlbum(draggedPhotoId, item.photo.id)
                }
                onTouchHover={handleTouchHover}
                onTouchDrop={handleTouchDrop}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function sortPhotosForCover(photos: Photo[]) {
  return [...photos]
    .sort((a, b) => {
      if ((b.likes ?? 0) !== (a.likes ?? 0)) return (b.likes ?? 0) - (a.likes ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

function getDefaultAlbumCoverPhotos(photos: Photo[]) {
  return sortPhotosForCover(photos).slice(0, 4);
}

function AlbumCollectionTile({
  album,
  photos,
  selectedCount,
  isDropTarget,
  canDrop,
  isPending,
  portfolio,
  onOpen,
  onToggle,
  onDelete,
  onPublish,
  onCoverChanged,
  onDragEnter,
  onDragLeave,
  onDropPhoto,
}: {
  album: Album;
  photos: Photo[];
  selectedCount: number;
  isDropTarget: boolean;
  canDrop: boolean;
  isPending: boolean;
  portfolio?: Portfolio;
  onOpen: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onCoverChanged?: (portfolioId: string, coverUrl: string) => void;
  onDragEnter: () => void;
  onDragLeave: () => void;
  onDropPhoto: (photoId: string) => void;
}) {
  const previews = getDefaultAlbumCoverPhotos(photos);
  const fullySelected = selectedCount === photos.length;
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [selectedCoverUrls, setSelectedCoverUrls] = useState<string[]>([]);
  const [, startCoverTransition] = useTransition();

  const sortedForCover = useMemo(() => sortPhotosForCover(photos), [photos]);
  const currentCoverUrls = useMemo(() => parseCoverUrls(portfolio?.cover_url), [portfolio?.cover_url]);

  const getInitialCoverSelection = () => {
    const photoUrls = new Set(photos.map((photo) => photo.url));
    const initialUrls = currentCoverUrls.filter((url) => photoUrls.has(url)).slice(0, 4);
    return initialUrls.length > 0 ? initialUrls : sortedForCover.slice(0, 1).map((photo) => photo.url);
  };

  const openCoverPicker = () => {
    setSelectedCoverUrls(getInitialCoverSelection());
    setCoverPickerOpen(true);
  };

  const handleToggleCover = (photo: Photo) => {
    setSelectedCoverUrls((prev) => {
      if (prev.includes(photo.url)) {
        if (prev.length === 1) {
          toast.error("至少选择 1 张封面");
          return prev;
        }
        return prev.filter((url) => url !== photo.url);
      }
      if (prev.length >= 4) {
        toast.error("最多选择 4 张封面");
        return prev;
      }
      return [...prev, photo.url];
    });
  };

  const handleSaveCover = () => {
    if (!portfolio) return;
    if (selectedCoverUrls.length < 1 || selectedCoverUrls.length > 4) {
      toast.error("请选择 1-4 张封面");
      return;
    }
    const nextCoverUrl = serializeCoverUrls(selectedCoverUrls);
    const prevCoverUrl = portfolio.cover_url;
    onCoverChanged?.(portfolio.id, nextCoverUrl);
    setCoverPickerOpen(false);
    startCoverTransition(async () => {
      const result = await updatePortfolioCover(portfolio.id, nextCoverUrl);
      if (result.error) {
        onCoverChanged?.(portfolio.id, prevCoverUrl ?? "");
        toast.error(result.error);
      } else {
        toast.success("封面已更换");
      }
    });
  };

  return (
    <div
      data-album-id={album.id}
      className={`group relative overflow-hidden rounded-lg border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        isDropTarget ? "border-gray-900 ring-2 ring-gray-900/10" : "border-gray-100 hover:border-gray-200"
      }`}
      onDragOver={(event) => {
        if (!canDrop || isPending) return;
        event.preventDefault();
      }}
      onDragEnter={(event) => {
        if (!canDrop || isPending) return;
        event.preventDefault();
        onDragEnter();
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        if (!canDrop || isPending) return;
        event.preventDefault();
        const photoId = event.dataTransfer.getData("text/photo-id");
        if (photoId) onDropPhoto(photoId);
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={isPending}
        className={`absolute left-2 top-2 z-20 flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-xs transition-all ${
          fullySelected
            ? "border-gray-900 bg-gray-900 text-white opacity-100"
            : "border-white/70 bg-white/90 text-gray-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-gray-900"
        }`}
        aria-label={fullySelected ? "取消选择相册照片" : "选择相册照片"}
      >
        {fullySelected ? <Check className="h-4 w-4" /> : selectedCount || ""}
      </button>

      <div
        role="button"
        tabIndex={isPending ? -1 : 0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        className="block w-full text-left"
      >
        <div className="relative aspect-square bg-gray-100">
          <CoverCollage
            urls={previews.map((photo) => photo.url)}
            alt={album.name}
            sizes="(max-width: 640px) 50vw, 25vw"
            imageClassName="transition-transform duration-300 group-hover:scale-[1.02]"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent p-3">
            <p className="truncate text-sm font-semibold text-white">{album.name}</p>
            <p className="mt-0.5 text-xs text-white/75">{photos.length} 张照片</p>
          </div>
          {canDrop && (
            <div
              className={`absolute inset-0 flex items-center justify-center bg-black/35 p-4 text-center transition-opacity ${
                isDropTarget ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <span className="rounded-md bg-white/92 px-3 py-2 text-sm font-medium text-gray-900">
                拖到这里归入“{album.name}”
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate text-xs text-gray-500">{album.description || "相册"}</span>
          <div className="flex items-center gap-1">
            {/* Desktop hover buttons */}
            {portfolio && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); openCoverPicker(); }}
                disabled={isPending || photos.length === 0}
                className="hidden sm:flex h-6 w-6 items-center justify-center rounded text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-purple-500 hover:bg-purple-50"
                aria-label="更换作品集封面"
                title="更换作品集封面"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPublish(); }}
              disabled={isPending}
              className="hidden sm:flex h-6 w-6 items-center justify-center rounded text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-500 hover:bg-blue-50"
              aria-label="发布为作品集"
              title="发布为作品集"
            >
              <BookImage className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={isPending}
              className="hidden sm:flex h-6 w-6 items-center justify-center rounded text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 hover:bg-red-50"
              aria-label="删除相册"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            {/* Mobile: always-visible "..." menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="sm:hidden h-6 w-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    aria-label="更多操作"
                  />
                }
              >
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onPublish(); }}
                  disabled={isPending}
                  className="gap-2"
                >
                  <BookImage className="h-4 w-4 text-blue-500" />
                  {portfolio ? "已发布为作品集" : "发布为作品集"}
                </DropdownMenuItem>
                {portfolio && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); openCoverPicker(); }}
                    disabled={isPending || photos.length === 0}
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4 text-purple-500" />
                    更换封面
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  disabled={isPending}
                  className="gap-2 text-red-500 focus:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                  删除相册
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlbumIcon className="h-3.5 w-3.5 shrink-0 text-gray-300" />
          </div>
        </div>
      </div>

      {portfolio && (
        <Dialog open={coverPickerOpen} onOpenChange={setCoverPickerOpen}>
          <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
            <DialogHeader className="px-5 pb-3 pt-5">
              <DialogTitle>更换封面</DialogTitle>
              <p className="text-sm text-gray-400">选择 1-4 张照片，封面会按数量自动拼接</p>
            </DialogHeader>
            <div className="border-y border-gray-100 px-5 py-3">
              <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-gray-100">
                <CoverCollage
                  urls={selectedCoverUrls}
                  alt={`${album.name} 封面预览`}
                  sizes="(max-width: 640px) 100vw, 540px"
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">已选 {selectedCoverUrls.length}/4</p>
            </div>
            <div className="max-h-[45vh] overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-3 gap-2">
                {sortedForCover.map((photo) => {
                  const selectedIndex = selectedCoverUrls.indexOf(photo.url);
                  const isCurrent = selectedIndex !== -1;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => handleToggleCover(photo)}
                      className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        isCurrent
                          ? "border-blue-500"
                          : "border-transparent hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={photo.url}
                        alt={photo.title}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                        sizes="(max-width: 640px) 33vw, 180px"
                        unoptimized={shouldBypassImageOptimization(photo.url)}
                      />
                      {isCurrent ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 shadow-md">
                            <span className="text-xs font-semibold text-white">{selectedIndex + 1}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-end justify-center bg-transparent pb-2 transition-colors group-hover:bg-black/25">
                          <span
                            className="rounded px-1.5 py-0.5 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
                            style={{ background: "rgba(0,0,0,.45)" }}
                          >
                            设为封面
                          </span>
                        </div>
                      )}
                      {photo.likes > 0 && (
                        <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                          <Heart className="h-3 w-3 fill-current" />
                          {photo.likes}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 pb-5">
              <Button variant="outline" onClick={() => setCoverPickerOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveCover} disabled={selectedCoverUrls.length < 1 || selectedCoverUrls.length > 4}>
                保存封面
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PhotoTile({
  photo,
  compact = false,
  selected,
  isDragging,
  isPhotoDropTarget = false,
  canDropForAlbum = false,
  isPending,
  onToggle,
  onDelete,
  onSave,
  onDragStart,
  onDragEnd,
  onDragEnterForAlbum,
  onDragLeaveForAlbum,
  onDropForAlbum,
  onTouchHover,
  onTouchDrop,
}: {
  photo: Photo;
  compact?: boolean;
  selected: boolean;
  isDragging: boolean;
  isPhotoDropTarget?: boolean;
  canDropForAlbum?: boolean;
  isPending: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onSave: (id: string, formData: FormData) => void;
  onDragStart: (photoId: string) => void;
  onDragEnd: () => void;
  onDragEnterForAlbum?: () => void;
  onDragLeaveForAlbum?: () => void;
  onDropForAlbum?: (draggedPhotoId: string) => void;
  onTouchHover?: (x: number, y: number) => void;
  onTouchDrop?: (photoId: string, x: number, y: number) => void;
}) {
  const touchStartRef = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null }>({ x: 0, y: 0, timer: null });
  const [touchDragging, setTouchDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isPending) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timer: setTimeout(() => {
        setTouchDragging(true);
        onDragStart(photo.id);
      }, 400),
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current.timer && !touchDragging) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (dx > 10 || dy > 10) {
      if (touchStartRef.current.timer) {
        clearTimeout(touchStartRef.current.timer);
        touchStartRef.current.timer = null;
      }
    }
    if (touchDragging) {
      e.preventDefault();
      onTouchHover?.(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current.timer) {
      clearTimeout(touchStartRef.current.timer);
      touchStartRef.current.timer = null;
    }
    if (touchDragging) {
      e.preventDefault();
      const touch = e.changedTouches[0];
      onTouchDrop?.(photo.id, touch.clientX, touch.clientY);
      setTouchDragging(false);
      onDragEnd();
    }
  };

  return (
    <div
      data-photo-id={photo.id}
      draggable={!isPending}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/photo-id", photo.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart(photo.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        if (!canDropForAlbum || isPending) return;
        event.preventDefault();
      }}
      onDragEnter={(event) => {
        if (!canDropForAlbum || isPending) return;
        event.preventDefault();
        onDragEnterForAlbum?.();
      }}
      onDragLeave={() => {
        if (!canDropForAlbum) return;
        onDragLeaveForAlbum?.();
      }}
      onDrop={(event) => {
        if (!canDropForAlbum || isPending) return;
        event.preventDefault();
        const draggedId = event.dataTransfer.getData("text/photo-id");
        if (draggedId && draggedId !== photo.id) onDropForAlbum?.(draggedId);
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`group relative overflow-hidden rounded-lg border bg-gray-100 transition-all ${
        selected ? "border-gray-900 ring-2 ring-gray-900/20" : isPhotoDropTarget ? "border-blue-400 ring-2 ring-blue-400/20" : "border-gray-100"
      } ${isDragging || touchDragging ? "scale-[0.95] opacity-60 z-50" : ""}`}
    >
      <Link href={`/photo/${photo.id}`} className="block">
        <div className={`relative ${compact ? "aspect-square" : "aspect-[4/3]"}`}>
          <Image
            src={photo.url}
            alt={photo.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized={shouldBypassImageOptimization(photo.url)}
          />
          {canDropForAlbum && (
            <div
              className={`absolute inset-0 flex items-center justify-center bg-blue-500/30 p-4 text-center transition-opacity ${
                isPhotoDropTarget ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <span className="rounded-md bg-white/95 px-3 py-2 text-xs font-medium text-blue-700">
                <FolderPlus className="inline h-3.5 w-3.5 mr-1" />
                创建相册
              </span>
            </div>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={onToggle}
        className={`absolute left-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-md border text-xs transition-all ${
          selected
            ? "border-gray-900 bg-gray-900 text-white opacity-100"
            : "border-white/70 bg-white/85 text-gray-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-gray-900"
        }`}
        aria-label={selected ? "取消选择照片" : "选择照片"}
      >
        {selected && <Check className="h-4 w-4" />}
      </button>

      <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/45 to-transparent p-3 text-white transition-opacity ${
          "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
        }`}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex-1 truncate text-sm font-medium">{photo.title}</h3>
            <Badge
              variant={photo.is_public ? "default" : "secondary"}
              className="shrink-0 border-white/20 bg-white/15 text-xs text-white backdrop-blur-sm"
            >
              {photo.is_public ? "公开" : "私密"}
            </Badge>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-white/75">
              {photo.albums?.name || "未归类"}
            </span>
            <div className="flex items-center gap-1 text-xs text-white/75">
              <Eye className="h-3.5 w-3.5" />
              {photo.views}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-white/70">
              {formatDistanceToNow(new Date(photo.created_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
            <div className="flex items-center gap-1.5">
              <ShareButton
                photoId={photo.id}
                title={photo.title}
                variant="ghost"
                size="sm"
                className="h-7 bg-white/12 px-2 text-white hover:bg-white/20 hover:text-white"
                iconOnly
              />
              <EditDialog photo={photo} onSave={onSave} />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 bg-white/12 px-2 text-white hover:bg-red-500/90 hover:text-white"
                onClick={onDelete}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Link href={`/photo/${photo.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 bg-white/12 px-2 text-white hover:bg-white/20 hover:text-white"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateAlbumDialog({
  onCreate,
  disabled,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: {
  onCreate: (formData: FormData, onDone: () => void) => void;
  disabled: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled
    ? (externalOnOpenChange ?? setInternalOpen)
    : setInternalOpen;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    onCreate(formData, () => {
      setName("");
      setDescription("");
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" disabled={disabled} />}>
        <FolderPlus className="h-3.5 w-3.5" />
        创建相册
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>创建相册</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>相册名称</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={!name.trim() || disabled}>
              创建
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  photo,
  onSave,
}: {
  photo: Photo;
  onSave: (id: string, formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(photo.title);
  const [description, setDescription] = useState(photo.description || "");
  const [isPublic, setIsPublic] = useState(photo.is_public);
  const [allowDownload, setAllowDownload] = useState(photo.allow_download !== false);

  const handleSave = () => {
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("is_public", String(isPublic));
    formData.set("allow_download", String(allowDownload));
    onSave(photo.id, formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 bg-white/12 px-2 text-white hover:bg-white/20 hover:text-white"
          />
        }
      >
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑照片</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>标题</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">公开</span>
            </label>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              {isPublic ? (
                <>
                  <Eye className="h-3.5 w-3.5" /> 所有人可见
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" /> 仅自己可见
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={allowDownload}
                onChange={(event) => setAllowDownload(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">允许下载</span>
            </label>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Download className="h-3.5 w-3.5" />
              {allowDownload ? "访客可下载 JPG 副本" : "隐藏下载入口"}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({ profile }: { profile: Profile | null }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("username", username);
      formData.set("bio", bio);
      const result = await updateProfileInfo(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("个人信息已更新");
        window.dispatchEvent(new Event("profile-updated"));
        router.refresh();
        setOpen(false);
      }
    });
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    const formData = new FormData();
    formData.set("cover", file);
    const result = await uploadCover(formData);
    setCoverUploading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("封面已更新");
      router.refresh();
    }
    event.target.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" />
        }
      >
        <Pencil className="h-3.5 w-3.5" />
        编辑资料
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑个人资料</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>用户名</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={30}
            />
          </div>
          <div className="space-y-2">
            <Label>个人简介</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="resize-none"
              maxLength={200}
              placeholder="介绍一下自己..."
            />
            <p className="text-xs text-gray-400 text-right">{bio.length}/200</p>
          </div>
          <div className="space-y-2">
            <Label>个人主页封面</Label>
            <label className="inline-flex cursor-pointer">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors">
                {coverUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {coverUploading ? "上传中..." : "上传封面图片"}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
                disabled={coverUploading}
              />
            </label>
            <p className="text-xs text-gray-400">推荐尺寸 1920x480，最大 10MB</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!username.trim() || isPending}
            >
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
