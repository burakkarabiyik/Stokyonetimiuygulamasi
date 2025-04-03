import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ServerNote } from "@shared/schema";

interface EditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: ServerNote;
  onNoteUpdated: () => void;
}

export default function EditNoteModal({ isOpen, onClose, note, onNoteUpdated }: EditNoteModalProps) {
  const [updatedNote, setUpdatedNote] = useState(note.note);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!updatedNote.trim()) {
      toast({
        title: "Hata",
        description: "Not boş olamaz",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      await apiRequest(`/api/server-notes/${note.id}`, {
        method: "PUT",
        body: JSON.stringify({ note: updatedNote }),
      });

      toast({
        title: "Başarılı",
        description: "Not güncellendi",
      });

      onNoteUpdated();
      onClose();
    } catch (error) {
      console.error("Not güncellenirken hata:", error);
      toast({
        title: "Hata",
        description: "Not güncellenirken bir hata oluştu",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Notu Düzenle</DialogTitle>
          <DialogDescription>
            Not içeriğini değiştirin ve kaydetmek için Güncelle butonuna tıklayın.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Textarea
            value={updatedNote}
            onChange={(e) => setUpdatedNote(e.target.value)}
            placeholder="Not içeriği..."
            className="min-h-[150px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating}>
            {isUpdating ? "Güncelleniyor..." : "Güncelle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}