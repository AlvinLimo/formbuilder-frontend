"use client";

type DeleteFormModalProps = {
  onClose: () => void;
  onConfirm: () => void;
};

export default function DeleteFormModal({
  onClose,
  onConfirm,
}: DeleteFormModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-xl font-bold">
          Delete Form
        </h2>

        <p className="mt-2 text-gray-600">
          Are you sure you want to delete this
          form?
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="rounded bg-red-600 px-4 py-2 text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}