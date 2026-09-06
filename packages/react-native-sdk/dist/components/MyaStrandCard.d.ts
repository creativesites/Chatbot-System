/**
 * MyaStrandCard
 *
 * Themeable mobile HairID Strand DNA card primitive.
 * Displays hair health score, strand metrics (porosity, density, texture),
 * and personalized product guidance.
 */
import { HairStrandData } from '../types';
import { MyaTheme } from './theme';
export interface MyaStrandCardProps {
    strandData: HairStrandData;
    theme?: Partial<MyaTheme>;
    onProductPress?: (product: any) => void;
}
export declare function MyaStrandCard({ strandData, theme }: MyaStrandCardProps): any;
//# sourceMappingURL=MyaStrandCard.d.ts.map