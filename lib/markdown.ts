import { Marked } from "marked";

// Nội dung thuyết minh soạn bằng Markdown (in đậm, gạch đầu dòng, bảng). Không cho phép HTML thô.
const marked = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html: () => "",
    link({ href, text }) {
      const safe = /^(https?:|mailto:|tel:|\/)/i.test(href) ? href : "#";
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
    image: () => "",
  },
});

export function md(src?: string | null): string {
  if (!src) return "";
  return marked.parse(src, { async: false }) as string;
}
