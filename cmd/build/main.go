// Command build renders the portfolio: content/site.yaml + content/work/*.md -> dist/.
//
//	go run ./cmd/build            # build into dist/
//	go run ./cmd/build -serve     # build, then serve dist/ on :8080
package main

import (
	"bytes"
	"flag"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/renderer/html"
	"gopkg.in/yaml.v3"
)

type Site struct {
	Name             string    `yaml:"name"`
	Handle           string    `yaml:"handle"`
	Role             string    `yaml:"role"`
	Tagline          string    `yaml:"tagline"`
	Intro            string    `yaml:"intro"`
	Available        bool      `yaml:"available"`
	AvailabilityNote string    `yaml:"availability_note"`
	BaseURL          string    `yaml:"base_url"`
	Contact          Contact   `yaml:"contact"`
	Services         []Service `yaml:"services"`
	Stack            []string  `yaml:"stack"`
	Proof            []Proof   `yaml:"proof"`
	Process          []Step    `yaml:"process"`
}

type Contact struct {
	Email           string `yaml:"email"`
	WhatsApp        string `yaml:"whatsapp"`
	WhatsAppMessage string `yaml:"whatsapp_message"`
	GitHub          string `yaml:"github"`
	LinkedIn        string `yaml:"linkedin"`
	ChatDemo        string `yaml:"chat_demo"`
	ChatDemoLabel   string `yaml:"chat_demo_label"`
}

type Service struct {
	Title        string `yaml:"title"`
	Body         string `yaml:"body"`
	Deliverables string `yaml:"deliverables"`
}

type Proof struct {
	Value string `yaml:"value"`
	Label string `yaml:"label"`
}

type Step struct {
	Title string `yaml:"title"`
	Body  string `yaml:"body"`
}

type Metric struct {
	Label string `yaml:"label"`
	Value string `yaml:"value"`
	Note  string `yaml:"note"`
}

// Work is one case study: YAML frontmatter + markdown body.
type Work struct {
	Title    string   `yaml:"title"`
	Slug     string   `yaml:"slug"`
	Client   string   `yaml:"client"`
	Role     string   `yaml:"role"`
	Period   string   `yaml:"period"`
	Summary  string   `yaml:"summary"`
	Tags     []string `yaml:"tags"`
	Metrics  []Metric `yaml:"metrics"`
	Repo     string   `yaml:"repo"`
	Live     string   `yaml:"live"`
	Featured bool     `yaml:"featured"`
	Order    int      `yaml:"order"`
	Draft    bool     `yaml:"draft"`

	Body template.HTML `yaml:"-"`
	URL  string        `yaml:"-"`
}

type pageData struct {
	Site  Site
	Works []Work
	Work  *Work
	Page  string // "home" | "case"
	Title string
	Desc  string
	URL   string
}

const (
	contentDir  = "content"
	workDir     = "content/work"
	templateDir = "templates"
	staticDir   = "static"
	outDir      = "dist"
)

func main() {
	serve := flag.Bool("serve", false, "serve dist/ on :8080 after building")
	flag.Parse()

	if err := build(); err != nil {
		log.Fatalf("build: %v", err)
	}
	log.Printf("built -> %s/", outDir)

	if *serve {
		log.Printf("serving http://localhost:8080")
		log.Fatal(http.ListenAndServe(":8080", http.FileServer(http.Dir(outDir))))
	}
}

func build() error {
	site, err := loadSite()
	if err != nil {
		return err
	}
	works, err := loadWorks()
	if err != nil {
		return err
	}

	tmpl, err := template.New("").Funcs(funcs()).ParseGlob(filepath.Join(templateDir, "*.html"))
	if err != nil {
		return fmt.Errorf("parse templates: %w", err)
	}

	if err := os.RemoveAll(outDir); err != nil {
		return err
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return err
	}

	home := pageData{
		Site: site, Works: works, Page: "home",
		Title: site.Name + " — " + site.Role,
		Desc:  site.Tagline,
		URL:   site.BaseURL + "/",
	}
	if err := render(tmpl, "index.html", filepath.Join(outDir, "index.html"), home); err != nil {
		return err
	}

	for i := range works {
		w := works[i]
		page := pageData{
			Site: site, Works: works, Work: &w, Page: "case",
			Title: w.Title + " — " + site.Name,
			Desc:  w.Summary,
			URL:   site.BaseURL + w.URL,
		}
		dst := filepath.Join(outDir, "work", w.Slug, "index.html")
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return err
		}
		if err := render(tmpl, "case.html", dst, page); err != nil {
			return err
		}
	}

	if err := render(tmpl, "404.html", filepath.Join(outDir, "404.html"), home); err != nil {
		return err
	}
	if err := copyTree(staticDir, filepath.Join(outDir, "static")); err != nil {
		return err
	}
	if err := writeSitemap(site, works); err != nil {
		return err
	}
	// GitHub Pages must not run Jekyll over our output.
	return os.WriteFile(filepath.Join(outDir, ".nojekyll"), nil, 0o644)
}

func loadSite() (Site, error) {
	var s Site
	b, err := os.ReadFile(filepath.Join(contentDir, "site.yaml"))
	if err != nil {
		return s, err
	}
	if err := yaml.Unmarshal(b, &s); err != nil {
		return s, fmt.Errorf("site.yaml: %w", err)
	}
	s.BaseURL = strings.TrimRight(s.BaseURL, "/")
	return s, nil
}

func loadWorks() ([]Work, error) {
	entries, err := os.ReadDir(workDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	md := goldmark.New(
		goldmark.WithExtensions(extension.GFM, extension.Typographer),
		goldmark.WithRendererOptions(html.WithUnsafe()),
	)

	var works []Work
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".md") {
			continue
		}
		path := filepath.Join(workDir, e.Name())
		raw, err := os.ReadFile(path)
		if err != nil {
			return nil, err
		}
		front, body, err := splitFrontmatter(raw)
		if err != nil {
			return nil, fmt.Errorf("%s: %w", path, err)
		}

		var w Work
		if err := yaml.Unmarshal(front, &w); err != nil {
			return nil, fmt.Errorf("%s frontmatter: %w", path, err)
		}
		if w.Draft {
			continue
		}
		if w.Slug == "" {
			w.Slug = strings.TrimSuffix(e.Name(), ".md")
		}
		if w.Title == "" {
			return nil, fmt.Errorf("%s: title is required", path)
		}

		var buf bytes.Buffer
		if err := md.Convert(body, &buf); err != nil {
			return nil, fmt.Errorf("%s: %w", path, err)
		}
		w.Body = template.HTML(buf.String())
		w.URL = "/work/" + w.Slug + "/"
		works = append(works, w)
	}

	// Explicit order first (ascending), then untouched (Order 0) by title.
	sort.SliceStable(works, func(i, j int) bool {
		a, b := works[i], works[j]
		if (a.Order == 0) != (b.Order == 0) {
			return b.Order == 0
		}
		if a.Order != b.Order {
			return a.Order < b.Order
		}
		return a.Title < b.Title
	})
	return works, nil
}

// splitFrontmatter separates a leading `---\n...\n---\n` YAML block from the body.
func splitFrontmatter(raw []byte) (front, body []byte, err error) {
	raw = bytes.TrimLeft(raw, "\uFEFF \t\r\n")
	if !bytes.HasPrefix(raw, []byte("---")) {
		return nil, nil, fmt.Errorf("missing YAML frontmatter")
	}
	rest := raw[3:]
	rest = bytes.TrimLeft(rest, "\r")
	if len(rest) > 0 && rest[0] == '\n' {
		rest = rest[1:]
	}
	idx := bytes.Index(rest, []byte("\n---"))
	if idx < 0 {
		return nil, nil, fmt.Errorf("unterminated YAML frontmatter")
	}
	front = rest[:idx]
	body = rest[idx+4:]
	return front, bytes.TrimLeft(body, "\r\n"), nil
}

func render(t *template.Template, name, dst string, data pageData) error {
	var buf bytes.Buffer
	if err := t.ExecuteTemplate(&buf, name, data); err != nil {
		return fmt.Errorf("render %s: %w", name, err)
	}
	return os.WriteFile(dst, buf.Bytes(), 0o644)
}

func funcs() template.FuncMap {
	return template.FuncMap{
		"waLink": func(c Contact) string {
			if c.WhatsApp == "" {
				return ""
			}
			digits := strings.Map(func(r rune) rune {
				if r >= '0' && r <= '9' {
					return r
				}
				return -1
			}, c.WhatsApp)
			return "https://wa.me/" + digits + "?text=" + urlEncode(c.WhatsAppMessage)
		},
		"mailto": func(c Contact) string {
			if c.Email == "" {
				return ""
			}
			return "mailto:" + c.Email + "?subject=" + urlEncode("Freelance project enquiry")
		},
		"featured": func(ws []Work) []Work {
			var out []Work
			for _, w := range ws {
				if w.Featured {
					out = append(out, w)
				}
			}
			if len(out) == 0 {
				return ws
			}
			return out
		},
		"others": func(ws []Work, cur *Work) []Work {
			var out []Work
			for _, w := range ws {
				if cur == nil || w.Slug != cur.Slug {
					out = append(out, w)
				}
			}
			return out
		},
		"join": strings.Join,
	}
}

func urlEncode(s string) string {
	var b strings.Builder
	for _, r := range []byte(s) {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9',
			r == '-', r == '_', r == '.', r == '~':
			b.WriteByte(r)
		default:
			fmt.Fprintf(&b, "%%%02X", r)
		}
	}
	return b.String()
}

func copyTree(src, dst string) error {
	return filepath.WalkDir(src, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			if os.IsNotExist(err) && path == src {
				return nil
			}
			return err
		}
		rel, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		target := filepath.Join(dst, rel)
		if d.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		in, err := os.Open(path)
		if err != nil {
			return err
		}
		defer in.Close()
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		out, err := os.Create(target)
		if err != nil {
			return err
		}
		defer out.Close()
		_, err = io.Copy(out, in)
		return err
	})
}

func writeSitemap(s Site, works []Work) error {
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")
	fmt.Fprintf(&b, "  <url><loc>%s/</loc></url>\n", s.BaseURL)
	for _, w := range works {
		fmt.Fprintf(&b, "  <url><loc>%s%s</loc></url>\n", s.BaseURL, w.URL)
	}
	b.WriteString("</urlset>\n")
	if err := os.WriteFile(filepath.Join(outDir, "sitemap.xml"), []byte(b.String()), 0o644); err != nil {
		return err
	}
	robots := fmt.Sprintf("User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n", s.BaseURL)
	return os.WriteFile(filepath.Join(outDir, "robots.txt"), []byte(robots), 0o644)
}
