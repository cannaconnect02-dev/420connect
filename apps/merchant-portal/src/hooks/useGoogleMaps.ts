import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

let googleMapsLoadPromise: Promise<void> | null = null;
let isLoaded = false;

export function useGoogleMaps() {
    const [loaded, setLoaded] = useState(isLoaded);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isLoaded) {
            setLoaded(true);
            return;
        }

        if (googleMapsLoadPromise) {
            googleMapsLoadPromise
                .then(() => setLoaded(true))
                .catch((err) => setError(err.message));
            return;
        }

        googleMapsLoadPromise = (async () => {
            try {
                // Fetch API key from edge function
                const { data, error: fetchError } = await supabase.functions.invoke('get-google-maps-key');

                if (fetchError || !data?.apiKey) {
                    throw new Error(fetchError?.message || 'Failed to fetch Google Maps API key');
                }

                // Load Google Maps script
                await new Promise<void>((resolve, reject) => {
                    if ((window as any).google?.maps?.places) {
                        resolve();
                        return;
                    }

                    const script = document.createElement('script');
                    script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places`;
                    script.async = true;
                    script.defer = true;

                    script.onload = () => {
                        isLoaded = true;
                        resolve();
                    };

                    script.onerror = () => {
                        reject(new Error('Failed to load Google Maps script'));
                    };

                    document.head.appendChild(script);
                });

                isLoaded = true;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error loading Google Maps';
                setError(message);
                throw err;
            }
        })();

        googleMapsLoadPromise
            .then(() => setLoaded(true))
            .catch((err) => setError(err.message));
    }, []);

    return { loaded, error };
}
