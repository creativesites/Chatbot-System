/**
 * MyaConsultationCard
 *
 * Themeable card for booking or reviewing a 1:1 consultation with a
 * certified MYAVANA Hair Specialist / Trichologist.
 */
import { MyaTheme } from './theme';
export interface SpecialistProfile {
    name: string;
    title: string;
    avatarUrl?: string;
    specialties?: string[];
    rating?: number;
    availableSlot?: string;
}
export interface MyaConsultationCardProps {
    specialist: SpecialistProfile;
    bookingUrl?: string;
    theme?: Partial<MyaTheme>;
    onBookConsultation?: (specialist: SpecialistProfile) => void;
}
export declare function MyaConsultationCard({ specialist, bookingUrl, theme, onBookConsultation }: MyaConsultationCardProps): any;
//# sourceMappingURL=MyaConsultationCard.d.ts.map