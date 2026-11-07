import library from "@/.generated/library.json";

export type Note = {
  file: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  body: string;
  text: string;
  hideTags: boolean;
};
export const notes: Note[] = library.notes;
export const assetRevision = library.assetRevision;
export const allTags = [...new Set(notes.flatMap(note => note.tags))].sort((a, b) => a.localeCompare(b));
export const tagCounts = allTags.map(tag => ({ tag, count: notes.filter(note => note.tags.includes(tag)).length }));
export const searchNotes = notes.map(({ body, ...note }) => note);
export const navigation = notes.map(({ url, title }) => ({ url, title }));
