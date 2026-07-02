"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { courseSchema } from "@/lib/zod-schemas";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

type FormValues = z.infer<typeof courseSchema>;

export function CourseFormDialog({ course }: { course?: any }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isEdit = !!course;
  const emptyDefaults: Partial<FormValues> = { name: "", track: "ROBOTICS", isActive: true, minAge: 5, maxAge: 12, description: "" };
  const {
    register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: course ?? emptyDefaults,
  });

  // Reset the form from current props every time the dialog opens, so a
  // reopened "New Course" dialog doesn't show the previously created course
  // and an Edit dialog always reflects the latest saved values.
  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) reset(course ?? emptyDefaults);
  }

  async function onSubmit(values: FormValues) {
    const res = await fetch(isEdit ? `/api/courses/${course.id}` : "/api/courses", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      toast.error("Failed to save course");
      return;
    }
    toast.success(isEdit ? "Course updated" : "Course created");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" size="sm">Edit</Button>
        ) : (
          <Button><Plus className="h-4 w-4 mr-2" /> New Course</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Course" : "Create Course"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Course Name / اسم الدورة</Label>
            <Input {...register("name")} placeholder="e.g. Scratch" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Track / المسار</Label>
            <Select value={watch("track")} onValueChange={(v) => setValue("track", v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ROBOTICS">Robotics / الروبوتات</SelectItem>
                <SelectItem value="PROGRAMMING">Programming / البرمجة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Age</Label>
              <Input type="number" {...register("minAge")} />
            </div>
            <div className="space-y-2">
              <Label>Max Age</Label>
              <Input type="number" {...register("maxAge")} />
              {errors.maxAge && <p className="text-xs text-destructive">{errors.maxAge.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register("description")} rows={3} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Course"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
