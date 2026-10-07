import React, { useEffect, useState } from 'react';
import { IonModal, IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { closeOutline, trashOutline } from 'ionicons/icons';
import {
  NoteForm,
  TroubleshootingDetail,
  createNote,
  deleteNote,
  emptyNoteForm,
  noteFormToInput,
  noteToForm,
  updateNote,
  validateNoteForm,
} from '../common/troubleshootingApi';
// 편집 모달의 칸·버튼 모양은 경력 편집과 같은 것을 쓴다(cr-editor, cr-field)
import './AdminCareer.css';

/** 무엇을 편집하는지. note 가 있으면 수정, 없으면 새 기록 */
export type NoteEditTarget = { note: TroubleshootingDetail } | { preset: Partial<NoteForm> };

interface Props {
  target: NoteEditTarget | null;
  /** 프로젝트 칸 자동완성. 같은 프로젝트가 표기 차이로 필터에서 갈라지지 않게 */
  projects: string[];
  onClose: () => void;
  /** 저장이면 저장된 기록, 삭제면 null */
  onSaved: (note: TroubleshootingDetail | null) => void;
}

/** 본문 칸. 저장 화면(SKILL)의 안내와 같은 말을 placeholder 로 단다 */
const BODY_FIELDS: Array<{ key: keyof NoteForm; label: string; rows: number; hint: string; required?: boolean }> = [
  { key: 'symptom', label: '증상', rows: 6, required: true, hint: '관측된 사실과 에러 메시지·로그 원문 그대로' },
  { key: 'rootCause', label: '원인', rows: 6, required: true, hint: '직접 원인 → 그 원인 → 왜 하필 지금' },
  { key: 'resolution', label: '해결', rows: 5, required: true, hint: '무엇을 왜 그렇게 고쳤는지' },
  { key: 'verification', label: '검증', rows: 4, hint: '재현 → 수정 → 재확인, 숫자로' },
  { key: 'prevention', label: '재발 방지', rows: 3, hint: '원칙과 같은 부류의 잠재 결함' },
  { key: 'lesson', label: '교훈', rows: 2, hint: '다른 프로젝트에도 통하는 한 문장' },
];

/**
 * 트러블슈팅 기록 추가·수정 모달.
 *
 * 확인 창은 ion-alert 대신 window.confirm — 모달 위에 alert 를 겹치면 포커스가 엉키기 쉽다.
 * 본문 칸은 등폭 글꼴이다. 로그를 붙여 넣으면 줄 맞춤이 살아 있어야 읽힌다.
 */
const AdminTroubleshootingEditor: React.FC<Props> = ({ target, projects, onClose, onSaved }) => {
  const [form, setForm] = useState<NoteForm>(emptyNoteForm());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const editing = target && 'note' in target ? target.note : null;

  // 열릴 때마다 대상으로 폼을 새로 채운다. 닫았다 다른 기록을 열면 이전 입력이 남지 않게
  useEffect(() => {
    if (!target) return;
    setForm('note' in target ? noteToForm(target.note) : emptyNoteForm(target.preset));
    setError('');
    setIsSaving(false);
  }, [target]);

  const set = (key: keyof NoteForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    const invalid = validateNoteForm(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const input = noteFormToInput(form);
      const saved = editing ? await updateNote(editing.slug, input) : await createNote(input);
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !window.confirm(`'${editing.title}' 기록을 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await deleteNote(editing.slug);
      onSaved(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
      setIsSaving(false);
    }
  };

  return (
    <IonModal isOpen={target !== null} onDidDismiss={onClose} className="cr-editor-modal ts-editor-modal">
      <div className="cr-editor">
        <header className="cr-editor-head">
          <h2>{editing ? '트러블슈팅 수정' : '트러블슈팅 추가'}</h2>
          <IonButton fill="clear" onClick={onClose} disabled={isSaving}>
            <IonIcon icon={closeOutline} />
          </IonButton>
        </header>

        <div className="cr-editor-body">
          <label className="cr-field">
            <span>제목 * (원인과 결과가 다 들어가게)</span>
            <input value={form.title} onChange={set('title')} />
          </label>

          <div className="cr-field-row">
            <label className="cr-field">
              <span>발생일 *</span>
              <input type="date" value={form.occurredOn} onChange={set('occurredOn')} />
            </label>
            <label className="cr-field">
              <span>프로젝트 *</span>
              <input value={form.project} onChange={set('project')} list="ts-project-list" />
              <datalist id="ts-project-list">
                {projects.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="cr-field-row">
            <label className="cr-field">
              <span>구성요소</span>
              <input value={form.component} onChange={set('component')} placeholder="어느 부분에서 터졌는지" />
            </label>
            <label className="cr-field">
              <span>심각도</span>
              <select value={form.severity} onChange={set('severity')}>
                <option value="">미지정</option>
                <option value="critical">critical</option>
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </label>
            <label className="cr-field">
              <span>에러 코드</span>
              <input value={form.errorCode} onChange={set('errorCode')} placeholder="SQLSTATE, HTTP status, 예외 이름" />
            </label>
          </div>

          {BODY_FIELDS.map((f) => (
            <label className="cr-field" key={f.key}>
              <span>
                {f.label}
                {f.required ? ' *' : ''}
              </span>
              <textarea
                className="ts-editor-body-text"
                rows={f.rows}
                value={form[f.key]}
                onChange={set(f.key)}
                placeholder={f.hint}
              />
            </label>
          ))}

          <div className="cr-field-row">
            <label className="cr-field">
              <span>기술 (쉼표 구분)</span>
              <input value={form.techStack} onChange={set('techStack')} />
            </label>
            <label className="cr-field">
              <span>태그 (쉼표 구분)</span>
              <input value={form.tags} onChange={set('tags')} />
            </label>
          </div>

          <label className="cr-field">
            <span>참고 링크 (한 줄에 하나, &quot;라벨: 주소&quot;)</span>
            <textarea rows={3} value={form.referenceLinks} onChange={set('referenceLinks')} />
          </label>

          {/* 상세 화면 주소라 만든 뒤에는 바꾸지 않는다 */}
          {editing ? (
            <p className="ts-editor-slug">
              slug <span className="ts-mono">{editing.slug}</span> (바꿀 수 없음)
            </p>
          ) : (
            <label className="cr-field">
              <span>slug (비우면 자동으로 만듦)</span>
              <input value={form.slug} onChange={set('slug')} placeholder="영문 소문자-숫자-하이픈" />
            </label>
          )}
        </div>

        {/* 본문이 스크롤되므로 오류는 버튼 바로 위에 고정한다 */}
        {error && <p className="cr-editor-error">{error}</p>}

        <footer className="cr-editor-foot">
          {editing && (
            <IonButton fill="clear" color="danger" onClick={handleDelete} disabled={isSaving}>
              <IonIcon slot="start" icon={trashOutline} />
              삭제
            </IonButton>
          )}
          <div className="cr-editor-foot-right">
            <IonButton fill="outline" onClick={onClose} disabled={isSaving}>
              취소
            </IonButton>
            <IonButton onClick={handleSave} disabled={isSaving}>
              {isSaving ? <IonSpinner name="crescent" style={{ width: 16, height: 16 }} /> : '저장'}
            </IonButton>
          </div>
        </footer>
      </div>
    </IonModal>
  );
};

export default AdminTroubleshootingEditor;
