import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  readonly?: boolean;
}

const StarRating = ({ value, onChange, readonly = false }: StarRatingProps) => {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          className="text-muted-foreground hover:scale-110 transition-transform disabled:cursor-default"
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              star <= display
                ? "fill-neon-yellow text-neon-yellow"
                : "fill-transparent text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export default StarRating;
