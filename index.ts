import WORDS_GUESSABLE from './words-guessable';
import WORDS_PLAYABLE from './words-playable';
import { join } from 'path';
import { existsSync, writeFileSync } from 'fs';

type Word = string;
type LetterDistribution = Map<string, number[]>;
type WordsWithOccurrences = Map<Word, Set<number>>;
type WordsWithRank = Map<Word, number>;

const OUT_DIR = 'out';

function getLetterDistribution(): LetterDistribution {
  const letterDistribution = WORDS_PLAYABLE.reduce((
    distribution: LetterDistribution,
    word: Word,
    wordIndex: number,
  ) => {
    const uniqueLetters = Array.from(new Set(word.split('')));

    return uniqueLetters.reduce((
      dist: LetterDistribution,
      letter: string,
    ) => {
      if (!dist.has(letter)) {
        dist.set(letter, []);
      }
      dist.get(letter)!.push(wordIndex);

      return dist;
    }, distribution);
  }, new Map() as LetterDistribution);

  const sortedDistribution = Array.from(letterDistribution).sort((a, b) => b[1].length - a[1].length);

  return new Map(sortedDistribution);
}

function getOptimalWords(distribution: LetterDistribution): WordsWithRank {
  const wordsWithOccurrences = WORDS_GUESSABLE.reduce((
    words: WordsWithOccurrences,
    word: Word,
  ) => {
    const occurrences = word.split('').reduce((occurrences: number[], letter: string) => {
      return occurrences.concat(distribution.get(letter)!);
    }, [] as number[]);

    return words.set(word, new Set(occurrences));
  }, new Map() as WordsWithOccurrences);

  const wordsSorted = Array.from(wordsWithOccurrences).sort((a, b) => b[1].size - a[1].size);
  const wordsRanked: [string, number][] = wordsSorted.map(([word, occurrences]) => [word, occurrences.size]);

  return new Map(wordsRanked);
}

function getUniqueOptimalWords(wordsRanked: WordsWithRank, overlaps: number = 0): string[] {
  const words = Array.from(wordsRanked).map(([word]) => word);
  const letters: Set<string> = new Set();

  return words.reduce((uniqueWords: string[], word: string) => {
    const uniqueLetters = Array.from(new Set(word.split('')));
    const nonUniqueCount = uniqueLetters.reduce((count: number, letter: string) => {
      if (letters.has(letter)) {
        count++;
      }
      return count;
    }, 0);

    if (nonUniqueCount <= overlaps) {
      uniqueWords.push(word);
      uniqueLetters.forEach((letter) => letters.add(letter));
    }

    return uniqueWords;
  }, []);
}

function writeCSV(filename: string, data: string, headings: string[] = []): void {
  const path = join(OUT_DIR, `${filename}.csv`);

  if (!existsSync(path)) {
    data = headings.join(',').concat(data);
    writeFileSync(path, data);
  }
}

function outputLetterDistribution(distribution: LetterDistribution): void {
  const formatted: [string, number][] = Array.from(distribution).map(
    ([letter, occurrences]) => [letter.toUpperCase(), occurrences.length]
  );

  console.log('Letter Distribution');
  formatted.forEach(([letter, rank]) => {
    console.log(`${letter}: ${rank}`);
  });

  const CSV = formatted.reduce((lines, dist) => {
    const [letter, rank] = dist;
    return lines.concat(`\n${letter},${rank}`);
  }, '');

  writeCSV(
    'letter-distribution',
    CSV,
    ['Letter', 'Occurrences'],
  );
}

function outputOptimalWords(words: WordsWithRank): void {
  const CSV = Array.from(words).reduce((lines, wordWithRank) => {
    const [word, rank] = wordWithRank;
    return lines.concat(`\n${word},${rank}`);
  }, '');

  writeCSV(
    'optimal-words',
    CSV,
    ['Word', 'Rank'],
  );
}

function outputUniqueOptimalWords(wordCollection: string[][]): void {
  const headings = [
    'Unique Optimal Words (No Overlap)',
    'Unique Optimal Words (Single Overlap)',
    'Unique Optimal Words (Double Overlap)',
  ];

  wordCollection.forEach((collection, index) => {
    console.log(`\n${headings[index]}`);
    collection.forEach((word) => console.log(word));
  });

  const CSV = wordCollection.reduce((lines, collection, index) => {
    const maybeNewLines = index > 0 ? '\n\n' : '';
    lines = lines.concat(`${maybeNewLines}${headings[index]},`);

    return collection.reduce((lines, word) => lines.concat(`\n${word},`), lines);
  }, '');

  writeCSV(
    'unique-optimal-words',
    CSV,
  );
}

function run() {
  const letterDistribution = getLetterDistribution();
  outputLetterDistribution(letterDistribution);

  const optimalWords = getOptimalWords(letterDistribution);
  outputOptimalWords(optimalWords);

  const uniqueOptimalWordsNoOverlap = getUniqueOptimalWords(optimalWords, 0);
  const uniqueOptimalWordsSingleOverlap = getUniqueOptimalWords(optimalWords, 1);
  const uniqueOptimalWordsDoubleOverlap = getUniqueOptimalWords(optimalWords, 2);
  outputUniqueOptimalWords([
    uniqueOptimalWordsNoOverlap,
    uniqueOptimalWordsSingleOverlap,
    uniqueOptimalWordsDoubleOverlap,
  ]);
}

run();
