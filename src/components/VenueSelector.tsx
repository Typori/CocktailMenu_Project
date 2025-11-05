import { Venue } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VenueSelectorProps {
  venues: Venue[];
  selectedVenueId: number | null;
  onSelectVenue: (venueId: number) => void;
}

export default function VenueSelector({ venues, selectedVenueId, onSelectVenue }: VenueSelectorProps) {
  return (
    <Select
      value={selectedVenueId?.toString() || ''}
      onValueChange={(value) => onSelectVenue(Number(value))}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="选择店面" />
      </SelectTrigger>
      <SelectContent>
        {venues.map((venue) => (
          <SelectItem key={venue.id} value={venue.id!.toString()}>
            {venue.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
