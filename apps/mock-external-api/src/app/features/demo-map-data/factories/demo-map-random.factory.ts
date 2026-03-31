import { RandomSource } from '@org/models';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DemoMapRandomFactory {
  createSeededRandom(seed: string): RandomSource {
    let state = 0;
    for (let index = 0; index < seed.length; index += 1) {
      state = (state * 31 + seed.charCodeAt(index)) >>> 0;
    }

    return () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 0x100000000;
    };
  }

  createRuntimeRandom(): RandomSource {
    return () => Math.random();
  }

  floatBetween(randomSource: RandomSource, min: number, max: number): number {
    return min + randomSource() * (max - min);
  }

  intBetween(randomSource: RandomSource, min: number, max: number): number {
    return Math.floor(this.floatBetween(randomSource, min, max + 1));
  }

  chance(randomSource: RandomSource, threshold: number): boolean {
    return randomSource() < threshold;
  }

  pickOne<TValue>(randomSource: RandomSource, values: TValue[]): TValue {
    return values[this.intBetween(randomSource, 0, values.length - 1)] as TValue;
  }

  shuffle<TValue>(randomSource: RandomSource, values: TValue[]): TValue[] {
    const copy = values.slice();

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = this.intBetween(randomSource, 0, index);
      const current = copy[index];
      copy[index] = copy[swapIndex] as TValue;
      copy[swapIndex] = current as TValue;
    }

    return copy;
  }
}
