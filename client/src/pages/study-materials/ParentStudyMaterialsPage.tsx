import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  FolderArchive,
  FileText,
  User,
  RotateCw,
  Search,
  ExternalLink,
  Download,
  Eye,
} from 'lucide-react';
import { studyMaterialService } from '../../services/studyMaterial.service';
import { StudyMaterialItem } from '../../types/studyMaterial';

interface WardOption {
  id: string;
  name: string;
  admissionNumber: string;
  grade: string;
  classId: string;
}

const SAMPLE_WARDS: WardOption[] = [
  { id: 'stu-101', name: 'Emma Watson', admissionNumber: 'ADM-2024-001', grade: 'Grade 10 - Section A', classId: 'cls-10' },
  { id: 'stu-104', name: 'Noah Ethan Vance', admissionNumber: 'ADM-2024-004', grade: 'Grade 10 - Section A', classId: 'cls-10' },
];

export const ParentStudyMaterialsPage: React.FC = () => {
  const [activeWard, setActiveWard] = useState<WardOption>(SAMPLE_WARDS[0]);
  const [materials, setMaterials] = useState<StudyMaterialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterialItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const loadWardMaterials = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await studyMaterialService.listStudyMaterials({
        studentId: activeWard.id,
        status: 'published',
      });
      setMaterials(res.data.filter((m) => m.status === 'published'));
    } catch (err) {
      console.error('Failed to load ward study materials:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWard.id]);

  useEffect(() => {
    loadWardMaterials();
  }, [loadWardMaterials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = m.title.toLowerCase().includes(q);
        const inDesc = m.description?.toLowerCase().includes(q);
        const inTags = m.tags.some((t) => t.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inTags) return false;
      }
      return true;
    });
  }, [materials, selectedCategory, searchQuery]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Ward Learning Materials & Curriculum Library"
        description="Review study guides, course syllabus packets, problem sets, and past examination papers provided to your children."
        actions={
          <Button variant="outline" size="sm" onClick={loadWardMaterials} className="gap-1.5">
            <RotateCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Multi-Ward Switcher */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/80">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <User className="h-4 w-4 text-primary" />
          <span>Active Child Profile:</span>
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_WARDS.map((w) => (
            <button
              key={w.id}
              onClick={() => setActiveWard(w)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeWard.id === w.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background hover:bg-muted text-foreground border border-input'
              }`}
            >
              {w.name} ({w.grade})
            </button>
          ))}
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3 rounded-xl border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search learning materials for ${activeWard.name}...`}
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
          <option value="all">All Material Types</option>
          <option value="notes">Lecture Notes</option>
          <option value="pdf">PDF Documents</option>
          <option value="worksheet">Worksheets</option>
          <option value="past_paper">Past Exam Papers</option>
          <option value="presentation">Presentations</option>
          <option value="video">Videos</option>
          <option value="external_link">External Resources</option>
        </select>
      </div>

      {/* Materials List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <EmptyState
          title="No materials found for active ward"
          description={`There are currently no learning documents uploaded for ${activeWard.name}'s class.`}
          icon={FolderArchive}
        />
      ) : (
        <div className="space-y-3">
          {filteredMaterials.map((item) => {
            const subjectName =
              typeof item.subjectId === 'object' && item.subjectId !== null
                ? item.subjectId.name
                : 'Subject';
            const uploaderName =
              typeof item.uploadedBy === 'object' && item.uploadedBy !== null
                ? item.uploadedBy.name
                : 'Instructor';

            return (
              <div
                key={item._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {subjectName}
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground capitalize">
                        {item.category.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="mt-1 font-semibold text-sm text-foreground">{item.title}</h3>
                    {item.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Uploaded by {uploaderName} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedMaterial(item);
                      setIsPreviewOpen(true);
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </Button>

                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
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
                      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Link</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Dialog */}
      {selectedMaterial && (
        <Dialog
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={selectedMaterial.title}
          description="Resource preview and ward study material information"
          className="max-w-lg"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedMaterial.category}</Badge>
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

            <div className="rounded-lg border bg-muted/20 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {selectedMaterial.originalFileName || 'Study Material Asset'}
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

export default ParentStudyMaterialsPage;
