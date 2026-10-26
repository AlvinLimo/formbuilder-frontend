type FormCardProps = {
  title: string;
  description: string;
  status: string;
};

export default function FormCard({
  title,
  description,
  status,
}: FormCardProps) {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-gray-500">
        {description}
      </p>

      <span className="mt-3 inline-block rounded bg-gray-100 px-2 py-1 text-sm">
        {status}
      </span>
    </div>
  );
}