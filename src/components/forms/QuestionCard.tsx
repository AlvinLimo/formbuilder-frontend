"use client";

import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import QuestionTypeSelector from "./QuestionTypeSelector";
import FormattingToolbar from "./FormattingToolbar";

// --- Sub-component for Draggable Options ---
function SortableOption({ option, index, type, onUpdate, onDelete, canDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: option.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 bg-white group relative">
      <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing p-1">
        ⠿
      </div>
      <div className={`h-4 w-4 border border-gray-300 ${type === "MULTIPLE_CHOICE" ? "rounded-sm" : "rounded-full"}`} />
      <input
        type="text"
        value={option.text}
        onChange={(e) => onUpdate(index, e.target.value)}
        className="flex-1 border-b border-transparent bg-transparent text-sm hover:border-gray-300 focus:border-blue-500 focus:outline-none"
      />
      {canDelete && (
        <button onClick={() => onDelete(index)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
      )}
    </div>
  );
}

// --- Main Question Card ---
interface Option { id: string; text: string; }
interface Validations { minLength?: number | ""; maxLength?: number | ""; min?: number | ""; max?: number | ""; }

interface QuestionCardProps {
  id: string; title: string; type: string; required: boolean; validations?: Validations; options?: Option[];
  onTitleChange: (value: string) => void; onTypeChange: (value: string) => void; onRequiredChange: (value: boolean) => void;
  onValidationChange: (key: keyof Validations, value: number | "") => void; onOptionsChange: (options: Option[]) => void;
  onDuplicate: () => void; onDelete: () => void;
}

export default function QuestionCard({ 
  id, title, type, required, validations = {}, options = [],
  onTitleChange, onTypeChange, onRequiredChange, onValidationChange, onOptionsChange, onDuplicate, onDelete 
}: QuestionCardProps) {
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : 1, opacity: isDragging ? 0.5 : 1 };

  const isSectionHeader = type === "SECTION_HEADER";
  const isChoice = type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE" || type === "DROPDOWN";

  const handleFormat = (syntax: string) => {
    if (syntax === "link") {
      onTitleChange(title + " [Link Text](https://example.com)");
    } else if (syntax === "list") {
      onTitleChange(title + "\n- List Item");
    } else {
      onTitleChange(title + syntax + "text" + syntax);
    }
  };

  const handleUpdateOption = (index: number, text: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], text };
    onOptionsChange(newOptions);
  };

  const handleAddOption = () => {
    onOptionsChange([...options, { id: Date.now().toString(), text: `Option ${options.length + 1}` }]);
  };

  const handleDeleteOption = (index: number) => {
    onOptionsChange(options.filter((_, i) => i !== index));
  };

  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = options.findIndex((o) => o.id === active.id);
      const newIndex = options.findIndex((o) => o.id === over.id);
      onOptionsChange(arrayMove(options, oldIndex, newIndex));
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={`relative rounded-lg border bg-white p-6 shadow-sm transition-colors focus-within:border-transparent focus-within:ring-2 focus-within:ring-blue-500 ${isDragging ? "border-blue-500 ring-2 ring-blue-500" : "border-gray-200"} ${isSectionHeader ? "bg-blue-50/40 border-blue-200" : ""}`}>
      
      {/* Card Drag Handle */}
      <div {...attributes} {...listeners} className="absolute left-1/2 top-1 -translate-x-1/2 cursor-grab p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing" title="Drag to reorder card">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5"><path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" /></svg>
      </div>

      <div className="mb-4 mt-2 flex flex-col gap-2">
        <FormattingToolbar onFormat={handleFormat} />
        
        <div className="flex items-start justify-between">
          <input 
            type="text" 
            value={title} 
            onChange={(e) => onTitleChange(e.target.value)} 
            placeholder={isSectionHeader ? "Section Header Title" : "Question Title"} 
            className={`w-full border-b border-transparent bg-transparent pb-1 placeholder-gray-400 transition-colors hover:border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-0 ${isSectionHeader ? "text-xl font-bold text-blue-900" : "text-lg font-medium text-gray-900"}`} 
          />
          <div className="ml-4 flex items-center gap-3">
            <button onClick={onDuplicate} className="text-gray-400 hover:text-blue-600" title="Duplicate">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 16.5V19.5a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9a2.25 2.25 0 0 1 2.25-2.25h3m3 0h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" /></svg>
            </button>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-500" title="Delete">
              <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Nested Drag-and-Drop for Options */}
      {isChoice && (
        <div className="mb-4 ml-2 flex flex-col gap-2">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleOptionDragEnd}>
            <SortableContext items={options.map(o => o.id)} strategy={verticalListSortingStrategy}>
              {options.map((option, index) => (
                <SortableOption key={option.id} option={option} index={index} type={type} onUpdate={handleUpdateOption} onDelete={handleDeleteOption} canDelete={options.length > 1} />
              ))}
            </SortableContext>
          </DndContext>
          <button onClick={handleAddOption} className="mt-2 flex items-center text-sm text-blue-600 hover:text-blue-700 ml-7">
            + Add Option
          </button>
        </div>
      )}

      {/* Settings Footer */}
      <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between">
          <QuestionTypeSelector value={type} onChange={onTypeChange} />
          {!isSectionHeader && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <span className="font-medium">Required</span>
              <input type="checkbox" checked={required} onChange={(e) => onRequiredChange(e.target.checked)} className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}