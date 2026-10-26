"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import {
  createFormSchema,
  CreateFormInput,
} from "@/lib/validations/form";

export default function CreateForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormInput>({
    resolver: zodResolver(createFormSchema),
  });

  const onSubmit = (data: CreateFormInput) => {
    console.log(data);
  };

  return (
    <div className="max-w-2xl p-6">
      <h1 className="mb-6 text-3xl font-bold">
        Create Form
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div>
          <label className="mb-2 block">
            Title
          </label>

          <Input
            {...register("title")}
            placeholder="Enter form title"
          />

          {errors.title && (
            <p className="mt-1 text-sm text-red-500">
              {errors.title.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block">
            Description
          </label>

          <Textarea
            {...register("description")}
            placeholder="Enter form description"
          />

          {errors.description && (
            <p className="mt-1 text-sm text-red-500">
              {errors.description.message}
            </p>
          )}
        </div>

        <Button type="submit">
          Save Draft
        </Button>
      </form>
    </div>
  );
}