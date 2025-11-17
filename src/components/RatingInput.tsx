import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function RatingInput({ 
  value, 
  onChange, 
  label = '评分',
  min = 0,
  max = 5,
  step = 0.1
}: RatingInputProps) {
  const [inputValue, setInputValue] = useState(value.toFixed(1));

  useEffect(() => {
    setInputValue(value.toFixed(1));
  }, [value]);

  const handleSliderChange = (values: number[]) => {
    const newValue = Math.round(values[0] * 10) / 10; // 保留1位小数
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
  };

  const handleInputBlur = () => {
    let num = parseFloat(inputValue);
    
    // 验证输入
    if (isNaN(num)) {
      num = 0;
    } else if (num < min) {
      num = min;
    } else if (num > max) {
      num = max;
    }
    
    // 保留1位小数
    num = Math.round(num * 10) / 10;
    
    onChange(num);
    setInputValue(num.toFixed(1));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="space-y-3">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Slider
            value={[value]}
            onValueChange={handleSliderChange}
            min={min}
            max={max}
            step={step}
            className="cursor-pointer"
          />
        </div>
        <div className="w-20">
          <Input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            min={min}
            max={max}
            step={step}
            className="text-center"
          />
        </div>
        <div className="w-16 text-sm text-muted-foreground text-right">
          / {max}
        </div>
      </div>
    </div>
  );
}
