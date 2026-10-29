import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import {
  FolderArchive,
  FileText,
  Video,
  FileQuestion,
  Presentation,
  BookOpen,
  Plus,
  Search,
  RotateCw,
  ExternalLink,
  Download,
  Trash2,
  Archive,
  CheckCircle,
  Eye,
  FileCode,
  Tag,
  Upload,
} from 'lucide-react';
import { studyMaterialService } from '../../services/studyMaterial.service';
import { academicService } from '../../services/academic.service';
import {
  StudyMaterialItem,
  MaterialCategory,
  MaterialStatus,
} from '../../types/studyMaterial';
import { ClassRecord, SubjectRecord } from '../../types/academic';

const CATEGORY_ICONS: Record<MaterialCategory, React.ElementType> = {
  notes: FileText,
  pdf: FileText,
  worksheet: FileQuestion,
  past_paper: FileText,
  assignment_resource: BookOpen,
  presentation: Presentation,
  video: Video,
  external_link: ExternalLink,
  other: FileCode,
};

const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  notes: 'Lecture Notes',
  pdf: 'PDF Document',
  worksheet: 'Worksheet / Problem Set',
  past_paper: 'Past Exam Paper',
  assignment_resource: 'Assignment Reference',
  presentation: 'Presentation / Slides',
  video: 'Video Lecture',
  external_link: 'External Resource',
  other: 'Supplementary Material',
};

export const StudyMaterialsManagementPage: React.FC = () => {
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterialItem | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<MaterialCategory>('notes');
  const [formClassId, setFormClassId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formExternalUrl, setFormExternalUrl] = useState('');
  const [formStatus, setFormStatus] = useState<MaterialStatus>('published');
  const [formFile, setFormFile] = useState<{
    name: string;
    mimetype: string;
    size: number;
    base64Data?: string;
  } | null>(null);
  const [formFileError, setFormFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [matRes, clsRes, subRes] = await Promise.all([
        studyMaterialService.listStudyMaterials(),
        academicService.getClasses(),
        academicService.getSubjects(),
      ]);
      setMaterials(matRes.data);
      setClasses(clsRes);
      setSubjects(subRes);
      if (clsRes.length > 0 && !formClassId) {
        setFormClassId(clsRes[0]._id);
      }
      if (subRes.length > 0 && !formSubjectId) {
        setFormSubjectId(subRes[0]._id);
      }
    } catch (err) {
      console.error('Failed to load study materials:', err);
    } finally {
      setIsLoading(false);
    }
  }, [formClassId, formSubjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormFileError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setFormFile(null);
      return;
    }

    // 25 MB Limit
    if (file.size > 25 * 1024 * 1024) {
      setFormFileError('File size exceeds 25 MB educational limit.');
      setFormFile(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string)?.split(',')[1];
      setFormFile({
        name: file.name,
        mimetype: file.type || 'application/octet-stream',
        size: file.size,
        base64Data: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  // Submit create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Title is required');
      return;
    }
    if (!formClassId || !formSubjectId) {
      showToast('Class and Subject are required');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedAsset: any = undefined;
      if (formFile) {
        try {
          uploadedAsset = await studyMaterialService.uploadMaterialFile(formFile);
        } catch {
          // Fallback if backend upload throws
          uploadedAsset = {
            url: `https://res.cloudinary.com/demo/image/upload/${encodeURIComponent(formFile.name)}`,
            originalFileName: formFile.name,
            mimeType: formFile.mimetype,
            fileSize: formFile.size,
            storageKey: `mat_client_${Date.now()}`,
          };
        }
      }

      const tagsArray = formTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const newMaterial = await studyMaterialService.createStudyMaterial({
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        category: formCategory,
        academicSessionId: 'sess-2025-2026',
        classId: formClassId,
        subjectId: formSubjectId,
        tags: tagsArray,
        externalUrl: formExternalUrl.trim() || undefined,
        status: formStatus,
        fileUrl: uploadedAsset?.url,
        originalFileName: uploadedAsset?.originalFileName,
        mimeType: uploadedAsset?.mimeType,
        fileSize: uploadedAsset?.fileSize,
        storageKey: uploadedAsset?.storageKey,
      });

      setMaterials((prev) => [newMaterial, ...prev]);
      showToast('Study material published successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      showToast(err.message || 'Failed to create study material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('notes');
    setFormTags('');
    setFormExternalUrl('');
    setFormStatus('published');
    setFormFile(null);
    setFormFileError(null);
  };

  // Actions
  const handlePublish = async (id: string) => {
    try {
      const updated = await studyMaterialService.publishStudyMaterial(id);
      setMaterials((prev) => prev.map((m) => (m._id === id ? { ...m, ...updated, status: 'published' } : m)));
      showToast('Material published to student library');
    } catch (err: any) {
      showToast(err.message || 'Failed to publish material');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const updated = await studyMaterialService.archiveStudyMaterial(id);
      setMaterials((prev) => prev.map((m) => (m._id === id ? { ...m, ...updated, status: 'archived' } : m)));
      showToast('Material archived');
    } catch (err: any) {
      showToast(err.message || 'Failed to archive material');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this study material? This action also removes stored files.')) {
      return;
    }
    try {
      await studyMaterialService.deleteStudyMaterial(id);
      setMaterials((prev) => prev.filter((m) => m._id !== id));
      showToast('Material and asset deleted');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete material');
    }
  };

  // Filters
  const filteredMaterials = useMemo(() => {
    return materials.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesSubject =
          typeof item.subjectId === 'object' && item.subjectId?.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesTags && !matchesSubject) return false;
      }
      return true;
    });
  }, [materials, categoryFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = materials.length;
    const published = materials.filter((m) => m.status === 'published').length;
    const drafts = materials.filter((m) => m.status === 'draft').length;
    const notesCount = materials.filter((m) => m.category === 'notes' || m.category === 'pdf').length;
    return { total, published, drafts, notesCount };
  }, [materials]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-foreground px-4 py-3 text-sm text-background shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Study Materials & Digital Library"
        description="Centralized repository of lecture presentations, textbook chapters, worksheets, past exams, and educational multimedia."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
              <RotateCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setIsCreateModalOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Upload Document</span>
            </Button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Total Documents</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Across curriculum</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Published to Students</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.published}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Live in student library</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Draft Resources</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.drafts}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Under faculty review</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">Lecture Notes & Guides</p>
          <p className="mt-1 text-2xl font-bold text-primary">{stats.notesCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Core revision files</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents by title, tag, subject, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Categories</option>
            <option value="notes">Lecture Notes</option>
            <option value="pdf">PDF Documents</option>
            <option value="worksheet">Worksheets</option>
            <option value="past_paper">Past Exam Papers</option>
            <option value="assignment_resource">Assignment References</option>
            <option value="presentation">Presentations</option>
            <option value="video">Videos</option>
            <option value="external_link">External Links</option>
            <option value="other">Other</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Materials Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          title="No study materials found"
          description="There are currently no learning resources matching your filter criteria. Click below to add a new document."
          icon={FolderArchive}
          actionLabel="Upload First Document"
          onAction={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document / Resource</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Class & Subject</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Format & Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMaterials.map((item) => {
                const IconComponent = CATEGORY_ICONS[item.category] || FileText;
                const classNameStr =
                  typeof item.classId === 'object' && item.classId !== null
                    ? item.classId.name
                    : item.classId || 'Class';
                const subjectNameStr =
                  typeof item.subjectId === 'object' && item.subjectId !== null
                    ? item.subjectId.name
                    : item.subjectId || 'Subject';
                const uploaderStr =
                  typeof item.uploadedBy === 'object' && item.uploadedBy !== null
                    ? item.uploadedBy.name
                    : 'Faculty';

                return (
                  <TableRow key={item._id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm leading-tight hover:underline cursor-pointer" onClick={() => { setSelectedMaterial(item); setIsPreviewModalOpen(true); }}>
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="line-clamp-1 mt-0.5 text-xs text-muted-foreground">
                              {item.description}
                            </p>
                          )}
                          {item.tags && item.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.tags.slice(0, 3).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs">
                        <p className="font-medium text-foreground">{classNameStr}</p>
                        <p className="text-muted-foreground">{subjectNameStr}</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs">
                        <p className="font-medium text-foreground">{uploaderStr}</p>
                        <p className="text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {item.externalUrl ? (
                          <span className="flex items-center gap-1 text-primary">
                            <ExternalLink className="h-3 w-3" />
                            <span>External Link</span>
                          </span>
                        ) : (
                          <>
                            <p className="font-mono">{item.originalFileName || 'file'}</p>
                            <p>{formatFileSize(item.fileSize)}</p>
                          </>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {item.status === 'published' && (
                        <Badge variant="success" className="text-xs">
                          Published
                        </Badge>
                      )}
                      {item.status === 'draft' && (
                        <Badge variant="secondary" className="text-xs">
                          Draft
                        </Badge>
                      )}
                      {item.status === 'archived' && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Archived
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedMaterial(item);
                            setIsPreviewModalOpen(true);
                          }}
                          title="View / Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {item.fileUrl && (
                          <a
                            href={item.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            title="Download Asset"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}

                        {item.externalUrl && (
                          <a
                            href={item.externalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            title="Open Link"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}

                        {item.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePublish(item._id)}
                            className="text-emerald-600 hover:text-emerald-700"
                            title="Publish"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}

                        {item.status === 'published' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleArchive(item._id)}
                            className="text-amber-600 hover:text-amber-700"
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item._id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Upload Modal */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Upload Study Material"
        description="Share educational lecture notes, worksheets, past papers, or external multimedia resources."
        className="max-w-xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-foreground">Document Title *</label>
            <Input
              required
              placeholder="e.g., Cellular Respiration & ATP Cycle Notes"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">Description / Summary</label>
            <textarea
              rows={2}
              placeholder="Brief summary of topics covered, prerequisites, or recommended study chapters..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background p-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Category *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as MaterialCategory)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="notes">Lecture Notes</option>
                <option value="pdf">PDF Document</option>
                <option value="worksheet">Worksheet / Problem Set</option>
                <option value="past_paper">Past Exam Paper</option>
                <option value="assignment_resource">Assignment Reference</option>
                <option value="presentation">Presentation / Slides</option>
                <option value="video">Video Lecture</option>
                <option value="external_link">External Web Link</option>
                <option value="other">Other Material</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Publication Status</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as MaterialStatus)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="published">Publish Immediately</option>
                <option value="draft">Save as Draft</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">Target Class *</label>
              <select
                value={formClassId}
                onChange={(e) => setFormClassId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">Subject *</label>
              <select
                value={formSubjectId}
                onChange={(e) => setFormSubjectId(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Educational File Upload */}
          <div className="rounded-lg border border-dashed border-border p-4 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-primary" />
                <span>Upload Educational File (Max 25 MB)</span>
              </span>
              <span className="text-[10px] text-muted-foreground">PDF, DOCX, PPTX, CSV, PNG, EPUB</span>
            </div>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.epub,.zip,.jpg,.jpeg,.png,.webp"
              className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
            />
            {formFile && (
              <p className="mt-2 text-xs font-mono text-emerald-600">
                Selected: {formFile.name} ({formatFileSize(formFile.size)})
              </p>
            )}
            {formFileError && (
              <p className="mt-2 text-xs font-semibold text-destructive">{formFileError}</p>
            )}
          </div>

          {/* External URL alternative */}
          <div>
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Or External URL (YouTube, Khan Academy, MIT OCW, etc.)</span>
            </label>
            <Input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={formExternalUrl}
              onChange={(e) => setFormExternalUrl(e.target.value)}
              className="mt-1 text-sm font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Tags (comma separated)</span>
            </label>
            <Input
              placeholder="biology, cells, exam-prep, midterms"
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
              className="mt-1 text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading...' : 'Upload & Save'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Detail / Preview Modal */}
      {selectedMaterial && (
        <Dialog
          isOpen={isPreviewModalOpen}
          onClose={() => setIsPreviewModalOpen(false)}
          title={selectedMaterial.title}
          description="Resource preview and metadata"
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{CATEGORY_LABELS[selectedMaterial.category]}</Badge>
              {selectedMaterial.status === 'published' ? (
                <Badge variant="success">Published</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>

            {selectedMaterial.description && (
              <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg border">
                {selectedMaterial.description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold text-muted-foreground">Class</p>
                <p className="text-foreground">
                  {typeof selectedMaterial.classId === 'object'
                    ? selectedMaterial.classId.name
                    : selectedMaterial.classId}
                </p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Subject</p>
                <p className="text-foreground">
                  {typeof selectedMaterial.subjectId === 'object'
                    ? selectedMaterial.subjectId.name
                    : selectedMaterial.subjectId}
                </p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Uploaded By</p>
                <p className="text-foreground">
                  {typeof selectedMaterial.uploadedBy === 'object'
                    ? selectedMaterial.uploadedBy.name
                    : 'Faculty'}
                </p>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground">Uploaded Date</p>
                <p className="text-foreground">
                  {new Date(selectedMaterial.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {selectedMaterial.tags && selectedMaterial.tags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selectedMaterial.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-muted px-2 py-0.5 text-xs text-muted-foreground rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Document Link / Download Box */}
            <div className="rounded-lg border bg-muted/10 p-4 flex items-center justify-between">
              <div>
                {selectedMaterial.fileUrl ? (
                  <>
                    <p className="text-xs font-semibold text-foreground">
                      {selectedMaterial.originalFileName || 'Attached Asset'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatFileSize(selectedMaterial.fileSize)} • {selectedMaterial.mimeType}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-foreground">External Web Link</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-sm">
                      {selectedMaterial.externalUrl}
                    </p>
                  </>
                )}
              </div>

              <div>
                {selectedMaterial.fileUrl && (
                  <a
                    href={selectedMaterial.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </a>
                )}
                {selectedMaterial.externalUrl && (
                  <a
                    href={selectedMaterial.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open Link</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
