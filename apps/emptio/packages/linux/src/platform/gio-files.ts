// The files of the host package's file store in one folder of the user's data
// directory. A write replaces the file atomically (GIO writes beside it and
// renames) and creates it readable by the user only: the files hold the
// spaces' secrets in clear, as the browser's database does.
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import type { Files } from '@nexumia-de/hospes';

export function gioFiles(folder: string): Files {
  const dir = Gio.File.new_for_path(folder);
  const made = (): void => {
    if (GLib.mkdir_with_parents(folder, 0o700) !== 0) {
      throw new Error(`The folder ${folder} could not be made`);
    }
  };
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  return {
    read(name) {
      try {
        const [, bytes] = dir.get_child(name).load_contents(null);
        return decoder.decode(bytes);
      } catch (error) {
        if (
          (error as { matches?: (d: unknown, c: unknown) => boolean }).matches?.(
            Gio.IOErrorEnum,
            Gio.IOErrorEnum.NOT_FOUND,
          )
        ) {
          return null;
        }
        throw error;
      }
    },
    write(name, text) {
      made();
      dir
        .get_child(name)
        .replace_contents(
          encoder.encode(text),
          null,
          false,
          Gio.FileCreateFlags.REPLACE_DESTINATION | Gio.FileCreateFlags.PRIVATE,
          null,
        );
    },
    remove(name) {
      try {
        dir.get_child(name).delete(null);
      } catch (error) {
        if (
          !(error as { matches?: (d: unknown, c: unknown) => boolean }).matches?.(
            Gio.IOErrorEnum,
            Gio.IOErrorEnum.NOT_FOUND,
          )
        ) {
          throw error;
        }
      }
    },
    list() {
      const names: string[] = [];
      let children;
      try {
        children = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
      } catch {
        return names;
      }
      for (let info = children.next_file(null); info !== null; info = children.next_file(null)) {
        names.push(info.get_name());
      }
      children.close(null);
      return names;
    },
  };
}
