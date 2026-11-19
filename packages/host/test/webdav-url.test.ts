import { expect, test } from 'vitest';
import { fileUrl, folderUrls, pathSegments } from '../src/webdav-url';

test('a path is joined to the base with every segment encoded', () => {
  expect(fileUrl('https://dav.example/f', 'places/a b/stock.json')).toBe(
    'https://dav.example/f/places/a%20b/stock.json',
  );
  expect(fileUrl('https://dav.example/f///', '/x//y?z#1.json')).toBe(
    'https://dav.example/f/x/y%3Fz%231.json',
  );
  expect(fileUrl('http://localhost:8080', 'ä/ö%2F.json')).toBe(
    'http://localhost:8080/%C3%A4/%C3%B6%252F.json',
  );
});

test('an encoded slash in a segment stays inside the segment', () => {
  expect(fileUrl('https://h', 'a%2F..%2Fb')).toBe('https://h/a%252F..%252Fb');
});

test('empty paths and dot segments are refused', () => {
  for (const path of ['', '/', '../x', 'a/../b', 'a/./b', '..', 'a/..']) {
    expect(() => pathSegments(path), path).toThrow(RangeError);
    expect(() => fileUrl('https://h', path), path).toThrow(RangeError);
  }
});

test('the folders above a file, outermost first, each with a slash', () => {
  expect(folderUrls('https://h/b', 'a/b c/f.json')).toEqual([
    'https://h/b/a/',
    'https://h/b/a/b%20c/',
  ]);
  expect(folderUrls('https://h/b/', 'f.json')).toEqual([]);
});
