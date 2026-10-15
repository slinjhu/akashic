import library from "@/.generated/library.json";

export type Note = {
  file: string;
  url: string;
  title: string;
  description: string;
  tags: string[];
  body: string;
  text: string;
  headings: { id: string; text: string; depth: number }[];
  hideTags: boolean;
};
export const notes: Note[] = library.notes;
export const assetRevision = library.assetRevision;
export const allTags = [...new Set(notes.flatMap(note => note.tags))].sort((a, b) => a.localeCompare(b));
export const searchNotes = notes.map(({ body, headings, ...note }) => note);
export const navigation = notes.map(({ url, title }) => ({ url, title }));
