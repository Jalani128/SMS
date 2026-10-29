import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  FolderArchive,
  FileText,
  Video,
  FileQuestion,
  Presentation,
  BookOpen,
  Search,
  RotateCw,
  ExternalLink,
  Download,
  Eye,
  FileCode,
  GraduationCap,
} from 'lucide-react';
import { studyMaterialService } from '../../services/studyMaterial.service';
import {
  StudyMaterialItem,
  MaterialCategory,
} from '../../types/studyMaterial';

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
  worksheet: 'Worksheet',
  past_paper: 'Past Exam Paper',
  assignment_resource: 'Assignment Reference',
  presentation: 'Presentation / Slides',
  video: 'Video Lecture',
  external_link: 'External Resource',
  other: 'Supplementary Material',
};

export const StudentStudyMaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterialItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const loadMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await studyMaterialService.listStudyMaterials({ status: 'published' });
      // Only show published to students
      setMaterials(res.data.filter((m) => m.status === 'published'));
    } catch (err) {
      console.error('Failed to load student study materials:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Extract distinct subjects
  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    materials.forEach((m) => {
      if (typeof m.subjectId === 'object' && m.subjectId !== null) {
        map.set(m.subjectId._id, m.subjectId.name);
      } else if (typeof m.subjectId === 'string') {
        map.set(m.subjectId, m.subjectId);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [materials]);

  // Filter materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (selectedSubject !== 'all') {
        const subId = typeof m.subjectId === 'object' && m.subjectId !== null ? m.subjectId._id : m.subjectId;
        if (subId !== selectedSubject) return false;
      }
      if (selectedCategory !== 'all' && m.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = m.title.toLowerCase().includes(q);
        const inDesc = m.description?.toLowerCase().includes(q);
        const inTags = m.tags.some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags) return false;
      }
      return true;
    });
  }, [materials, selectedSubject, selectedCategory, searchQuery]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Student Learning Resources & Library"
        description="Access class notes, verified past examination papers, syllabus worksheets, and educational lecture recordings."
        badge={
          <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/20 text-xs">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Grade 10 Curriculum</span>
          </Badge>
        }
        actions={
          <Button variant="outline" size="sm" onClick={loadMaterials} className="gap-1.5">
            <RotateCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Subject Pills Filter */}
      <div className="flex flex-wrap items-center gap-2 pb-1 overflow-x-auto">
        <button
          onClick={() => setSelectedSubject('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selectedSubject === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          All Subjects ({materials.length})
        </button>
        {subjects.map((sub) => {
          const count = materials.filter((m) => {
            const sId = typeof m.subjectId === 'object' && m.subjectId !== null ? m.subjectId._id : m.subjectId;
            return sId === sub.id;
          }).length;
          return (
            <button
              key={sub.id}
              onClick={() => setSelectedSubject(sub.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedSubject === sub.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {sub.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3 rounded-xl border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search learning materials by topic, keywords, or exam year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Content Formats</option>
          <option value="notes">Lecture Notes</option>
          <option value="pdf">PDF Documents</option>
          <option value="worksheet">Worksheets</option>
          <option value="past_paper">Past Exam Papers</option>
          <option value="presentation">Presentations</option>
          <option value="video">Videos</option>
          <option value="external_link">External Links</option>
        </select>
      </div>

      {/* Resource Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          title="No study resources found"
          description="There are currently no learning documents matching your filter criteria. Try selecting another subject or clearing your search."
          icon={FolderArchive}
          actionLabel="Show All Materials"
          onAction={() => {
            setSelectedSubject('all');
            setSelectedCategory('all');
            setSearchQuery('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((item) => {
            const IconComp = CATEGORY_ICONS[item.category] || FileText;
            const subjectName =
              typeof item.subjectId === 'object' && item.subjectId !== null
                ? item.subjectId.name
                : 'General';
            const uploaderName =
              typeof item.uploadedBy === 'object' && item.uploadedBy !== null
                ? item.uploadedBy.name
                : 'Faculty Instructor';

            return (
              <div
                key={item._id}
                className="group flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-all border-border/80"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="outline" className="text-[11px] font-semibold text-primary bg-primary/5">
                      {subjectName}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                      <IconComp className="h-3 w-3" />
                      <span>{CATEGORY_LABELS[item.category]}</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3
                    className="font-bold text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedMaterial(item);
                      setIsPreviewOpen(true);
                    }}
                  >
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Info & Actions */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                  <div className="text-[11px] text-muted-foreground">
                    <p className="font-medium text-foreground">{uploaderName}</p>
                    <p>{formatFileSize(item.fileSize) || (item.externalUrl ? 'Web Link' : 'File')}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedMaterial(item);
                        setIsPreviewOpen(true);
                      }}
                      title="Quick Preview"
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                        title="Download Asset"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    )}

                    {item.externalUrl && (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                        title="Open Resource"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Open</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Dialog */}
      {selectedMaterial && (
        <Dialog
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={selectedMaterial.title}
          description="Resource preview and details"
          className="max-w-xl"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{CATEGORY_LABELS[selectedMaterial.category]}</Badge>
              <Badge variant="secondary">
                {typeof selectedMaterial.subjectId === 'object'
                  ? selectedMaterial.subjectId.name
                  : 'Subject'}
              </Badge>
            </div>

            {selectedMaterial.description && (
              <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border">
                {selectedMaterial.description}
              </p>
            )}

            {selectedMaterial.tags && selectedMaterial.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedMaterial.tags.map((t, idx) => (
                  <span key={idx} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div className="rounded-lg border bg-muted/20 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {selectedMaterial.originalFileName || 'Educational Resource Asset'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatFileSize(selectedMaterial.fileSize) || selectedMaterial.externalUrl}
                </p>
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
                    <span>Open Web Link</span>
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

export default StudentStudyMaterialsPage;
