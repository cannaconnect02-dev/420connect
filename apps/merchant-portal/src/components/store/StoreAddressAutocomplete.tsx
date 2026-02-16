import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface StoreAddressAutocompleteProps {
    value: string;
    onChange: (address: string, latitude: number | null, longitude: number | null) => void;
    hasCoordinates: boolean;
}

export function StoreAddressAutocomplete({
    value,
    onChange,
    hasCoordinates
}: StoreAddressAutocompleteProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Sync the input DOM value when the parent's value prop changes externally
    // (e.g. on initial load or after a place_changed event updates state)
    useEffect(() => {
        if (inputRef.current && inputRef.current.value !== value) {
            inputRef.current.value = value;
        }
    }, [value]);

    useEffect(() => {
        let retryCount = 0;
        const maxRetries = 20;

        const initAutocomplete = () => {
            if ((window as any).google?.maps?.places && inputRef.current) {
                try {
                    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
                        types: ['address'],
                        componentRestrictions: { country: 'za' },
                        fields: ['address_components', 'formatted_address', 'geometry'],
                    });

                    autocompleteRef.current.addListener('place_changed', () => {
                        const place = autocompleteRef.current?.getPlace();

                        if (place?.formatted_address && place?.geometry?.location) {
                            const lat = place.geometry.location.lat();
                            const lng = place.geometry.location.lng();
                            // Update the input DOM value to match the formatted address
                            if (inputRef.current) {
                                inputRef.current.value = place.formatted_address;
                            }
                            onChangeRef.current(place.formatted_address, lat, lng);
                        }
                    });

                    setIsLoading(false);
                    setError(null);
                } catch (err) {
                    console.error('Error initializing autocomplete:', err);
                    setError('Failed to initialize address search');
                    setIsLoading(false);
                }
            } else if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(initAutocomplete, 500);
            } else {
                setIsLoading(false);
                setError('Address search unavailable');
            }
        };

        initAutocomplete();

        return () => {
            if (autocompleteRef.current) {
                google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
        };
    }, []);

    const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // When the user manually types, update the parent with the new text
        // but preserve existing coordinates (they'll be updated when a place is selected)
        onChangeRef.current(e.target.value, null, null);
    };

    return (
        <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
            </Label>
            <div className="relative">
                {/* Uncontrolled input: uses defaultValue + ref so Google Maps
                    Autocomplete can freely update the DOM value when a place
                    is selected, without React overriding it. */}
                <input
                    ref={inputRef}
                    id="address"
                    defaultValue={value}
                    onChange={handleManualChange}
                    placeholder="Start typing your store address..."
                    required
                    className={cn(
                        "flex h-12 w-full rounded-xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white ring-offset-background placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-green-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                        hasCoordinates ? 'pr-10' : ''
                    )}
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                )}
                {!isLoading && hasCoordinates && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                )}
            </div>

            {error && (
                <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
            )}

            {!hasCoordinates && !isLoading && !error && (
                <p className="text-xs text-muted-foreground">
                    Select an address from the dropdown to enable distance-based delivery pricing
                </p>
            )}

            {hasCoordinates && (
                <p className="text-xs text-primary flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Location verified - delivery distance can be calculated
                </p>
            )}
        </div>
    );
}
