"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { poster } from "@/lib/fetcher";

export function ImportReelDialog({ niche, onImported }: { niche: string; onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState("");
  const [creatorUsername, setCreatorUsername] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");

  async function submit() {
    if (!url || !creatorUsername) {
      toast.error("لینک و نام کاربری سازنده الزامی است");
      return;
    }
    setLoading(true);
    try {
      await poster("/api/discovery/import", {
        url,
        niche,
        creatorUsername,
        views: views ? Number(views) : undefined,
        likes: likes ? Number(likes) : undefined,
        comments: comments ? Number(comments) : undefined,
      });
      toast.success("ریلز وارد شد");
      setOpen(false);
      setUrl("");
      setCreatorUsername("");
      setViews("");
      setLikes("");
      setComments("");
      onImported();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "وارد کردن ناموفق بود");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>وارد کردن ریلز با لینک</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>وارد کردن ریلز</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url">لینک ریلز</Label>
            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="creator">نام کاربری سازنده</Label>
            <Input id="creator" value={creatorUsername} onChange={(e) => setCreatorUsername(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="views">بازدید</Label>
              <Input id="views" type="number" value={views} onChange={(e) => setViews(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="likes">لایک</Label>
              <Input id="likes" type="number" value={likes} onChange={(e) => setLikes(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comments">کامنت</Label>
              <Input id="comments" type="number" value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={loading}>
            {loading ? "در حال وارد کردن..." : "وارد کردن"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
