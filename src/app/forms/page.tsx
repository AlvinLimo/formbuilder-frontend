import FormCard from "@/components/forms/FormCard";

export default function FormsPage() {
  const forms = [
    {
      id: "1",
      title: "Customer Feedback",
      description: "Collect feedback from customers",
      status: "DRAFT",
    },
  ];

  return (
    <div className="p-6">
      <h1 className="mb-6 text-3xl font-bold">
        Forms Dashboard
      </h1>

      <div className="space-y-4">
        {forms.map((form) => (
          <FormCard
            key={form.id}
            title={form.title}
            description={form.description}
            status={form.status}
          />
        ))}
      </div>
    </div>
  );
}