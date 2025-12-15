import { Label } from "@/components/ui/label";

const HOURS = ["3h","6h","9h","12h","15h","18h","21h","24h"];

export default function ScheduleSelector({ value = [], onChange }) {
  return (
    <div className="space-y-2">
      <Label>Horários da infusão</Label>

      <div className="grid grid-cols-4 gap-2">
        {HOURS.map((h) => (
          <label key={h} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(h)}
              onChange={() => {
                if (value.includes(h)) {
                  onChange(value.filter((v) => v !== h));
                } else {
                  onChange([...value, h]);
                }
              }}
            />
            {h}
          </label>
        ))}
      </div>
    </div>
  );
}
