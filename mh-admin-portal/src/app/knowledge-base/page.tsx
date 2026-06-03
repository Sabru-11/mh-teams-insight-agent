"use client";

import { useState } from "react";
import { useApi } from "@/hooks/use-api";
import {
  getKbStats,
  uploadKbArticles,
  uploadKbFile,
  SUPPORTED_KB_FILE_TYPES,
  type KbStats,
  type KbArticleInput,
} from "@/lib/api";
import { StatCard, LoadingSpinner, ErrorMessage, Button, Badge } from "@/components/ui/shared";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen, Database, Tag, TicketCheck, MessageSquare, Upload, Plus, Trash2, CheckCircle2, FileUp, X, FileText } from "lucide-react";

interface ArticleForm {
  title: string;
  content: string;
  category: string;
  priority: string;
}

const emptyArticle: ArticleForm = { title: "", content: "", category: "", priority: "medium" };

export default function KnowledgeBasePage() {
  const { data, loading, error, refetch } = useApi<KbStats>(() => getKbStats());
  const [articles, setArticles] = useState<ArticleForm[]>([{ ...emptyArticle }]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const [uploadMode, setUploadMode] = useState<"form" | "json" | "file">("file");
  const [jsonText, setJsonText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileCategory, setFileCategory] = useState("");
  const [filePriority, setFilePriority] = useState("medium");
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploadResult, setFileUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const updateArticle = (idx: number, field: keyof ArticleForm, value: string) => {
    setArticles((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));
  };

  const removeArticle = (idx: number) => {
    setArticles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadResult(null);
    try {
      let payload: KbArticleInput[];
      if (uploadMode === "json") {
        const parsed = JSON.parse(jsonText);
        payload = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        payload = articles.filter((a) => a.title && a.content);
      }
      if (payload.length === 0) {
        setUploadResult({ success: false, message: "No valid articles to upload" });
        return;
      }
      const result = await uploadKbArticles(payload);
      setUploadResult({ success: true, message: `Uploaded ${result.uploaded} article(s) to Qdrant (IDs: ${result.point_ids.join(", ")})` });
      setArticles([{ ...emptyArticle }]);
      setJsonText("");
      refetch();
    } catch (e: unknown) {
      setUploadResult({ success: false, message: e instanceof Error ? e.message : "Upload failed" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const accepted = SUPPORTED_KB_FILE_TYPES.map((t) => t.slice(1)); // remove leading dot
      const valid = files.filter((f) => {
        const ext = f.name.split(".").pop()?.toLowerCase() || "";
        return accepted.includes(ext);
      });
      setSelectedFiles((prev) => [...prev, ...valid]);
      e.target.value = ""; // reset input so same file can be re-selected
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const accepted = SUPPORTED_KB_FILE_TYPES.map((t) => t.slice(1));
    const valid = files.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      return accepted.includes(ext);
    });
    setSelectedFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;
    setFileUploading(true);
    setFileUploadResult(null);

    let totalUploaded = 0;
    let totalArticles = 0;
    const errors: string[] = [];

    for (const file of selectedFiles) {
      try {
        const result = await uploadKbFile(file, fileCategory, filePriority);
        totalUploaded += result.uploaded;
        totalArticles += result.articles_extracted;
      } catch (e: unknown) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : "Failed"}`);
      }
    }

    if (errors.length > 0 && totalUploaded === 0) {
      setFileUploadResult({ success: false, message: errors.join("\n") });
    } else if (errors.length > 0) {
      setFileUploadResult({
        success: true,
        message: `Uploaded ${totalUploaded} article(s) from ${totalArticles} extracted. Some files failed: ${errors.join("; ")}`,
      });
    } else {
      setFileUploadResult({
        success: true,
        message: `Uploaded ${totalUploaded} article(s) extracted from ${selectedFiles.length} file(s)`,
      });
    }

    setSelectedFiles([]);
    refetch();
    setFileUploading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!data) return null;

  const stats = data.last_7_days;
  const collection = data.collection;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Knowledge Base</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Qdrant collection stats and article management</p>
      </div>

      {/* Collection info */}
      {collection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Vector Collection
            </CardTitle>
            <CardDescription>Qdrant collection details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Collection</p>
                <p className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-100">{collection.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Points</p>
                <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-100">{collection.points_count}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Vector Size</p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{collection.vector_size}-dim</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Distance</p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{collection.distance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message classification stats */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Message Classification (Last 7 Days)
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Messages" value={stats.total_messages} icon={<MessageSquare className="h-5 w-5" />} />
          <StatCard label="Classified Rate" value={`${(stats.classified_rate * 100).toFixed(1)}%`} icon={<Tag className="h-5 w-5" />} />
          <StatCard label="Ticket Eligible" value={stats.ticket_eligible} icon={<TicketCheck className="h-5 w-5" />} />
          <StatCard label="FYI Messages" value={stats.fyi_count} icon={<BookOpen className="h-5 w-5" />} />
        </div>
      </div>

      {/* KB Article Upload */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                Upload KB Articles
              </CardTitle>
              <CardDescription>Add knowledge base articles to the vector store for retrieval</CardDescription>
            </div>
            <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
              <button
                onClick={() => setUploadMode("form")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${uploadMode === "form" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500"}`}
              >
                Form
              </button>
              <button
                onClick={() => setUploadMode("json")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${uploadMode === "json" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500"}`}
              >
                JSON
              </button>
              <button
                onClick={() => setUploadMode("file")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${uploadMode === "file" ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-500"}`}
              >
                File
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {uploadResult && (
            <div className={`mb-4 flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${uploadResult.success ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"}`}>
              {uploadResult.success && <CheckCircle2 className="h-4 w-4" />}
              {uploadResult.message}
            </div>
          )}

          {uploadMode === "json" && (
            <div>
              <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                Paste a JSON array of articles. Each article needs: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">title</code>, <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">content</code>. Optional: <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">category</code>, <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">priority</code>.
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={`[\n  {\n    "title": "VPN Troubleshooting",\n    "content": "If VPN disconnects frequently, check...",\n    "category": "IT Support"\n  }\n]`}
                className="h-48 w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          )}

          {uploadMode === "form" && (
            <div className="space-y-4">
              {articles.map((article, idx) => (
                <div key={idx} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="outline">Article {idx + 1}</Badge>
                    {articles.length > 1 && (
                      <button onClick={() => removeArticle(idx)} className="text-zinc-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Title *</label>
                      <input
                        value={article.title}
                        onChange={(e) => updateArticle(idx, "title", e.target.value)}
                        placeholder="e.g., VPN Troubleshooting Guide"
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Category</label>
                        <input
                          value={article.category}
                          onChange={(e) => updateArticle(idx, "category", e.target.value)}
                          placeholder="IT Support"
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Priority</label>
                        <select
                          value={article.priority}
                          onChange={(e) => updateArticle(idx, "priority", e.target.value)}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Content *</label>
                    <textarea
                      value={article.content}
                      onChange={(e) => updateArticle(idx, "content", e.target.value)}
                      placeholder="Detailed article content that will be embedded and used for KB retrieval..."
                      rows={3}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setArticles([...articles, { ...emptyArticle }])}>
                <Plus className="h-4 w-4" />
                Add Another Article
              </Button>
            </div>
          )}

          {uploadMode === "file" && (
            <div className="space-y-4">
              {fileUploadResult && (
                <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${fileUploadResult.success ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"}`}>
                  {fileUploadResult.success && <CheckCircle2 className="h-4 w-4" />}
                  {fileUploadResult.message}
                </div>
              )}

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-8 transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-blue-500 dark:hover:bg-blue-900/10"
              >
                <FileUp className="mb-3 h-10 w-10 text-zinc-400" />
                <p className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Drag & drop files here, or{" "}
                  <label className="cursor-pointer text-blue-600 underline hover:text-blue-700 dark:text-blue-400">
                    browse
                    <input
                      type="file"
                      multiple
                      accept={SUPPORTED_KB_FILE_TYPES.join(",")}
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Supported: PDF, DOCX, TXT, Markdown, CSV, Excel, JSON (max 10 MB each)
                </p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {selectedFiles.length} file(s) selected
                  </p>
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-400" />
                        <span className="text-sm text-zinc-900 dark:text-zinc-100">{file.name}</span>
                        <span className="text-xs text-zinc-400">{formatFileSize(file.size)}</span>
                      </div>
                      <button onClick={() => removeFile(idx)} className="text-zinc-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Category (all files)</label>
                  <input
                    value={fileCategory}
                    onChange={(e) => setFileCategory(e.target.value)}
                    placeholder="e.g., IT Support"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Priority (all files)</label>
                  <select
                    value={filePriority}
                    onChange={(e) => setFilePriority(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <Button onClick={handleFileUpload} disabled={fileUploading || selectedFiles.length === 0}>
                <Upload className="h-4 w-4" />
                {fileUploading ? "Parsing & Embedding..." : `Upload ${selectedFiles.length} File(s) to Qdrant`}
              </Button>
            </div>
          )}

          {uploadMode !== "file" && (
            <div className="mt-4">
              <Button onClick={handleUpload} disabled={uploading}>
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading & Embedding..." : "Upload to Qdrant"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
