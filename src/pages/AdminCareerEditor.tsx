import React, { useEffect, useState } from 'react';
import { IonModal, IonButton, IonIcon, IonSpinner } from '@ionic/react';
import { closeOutline, trashOutline } from 'ionicons/icons';
import {
  CareerEntry,
  CareerForm,
  ENTRY_TYPES,
  createCareer,
  deleteCareer,
  emptyForm,
  entryToForm,
  formToInput,
  updateCareer,
  validateForm,
} from '../common/careerApi';

/** 무엇을 편집하는지. entry 가 있으면 수정, 없으면 preset 으로 채운 새 항목 */
export type EditTarget = { entry: CareerEntry } | { preset: Partial<CareerForm> };

interface Props {
  target: EditTarget | null;
  /** 회사 칸 자동완성. 오타로 회사가 둘로 갈라지는 걸 막는다(이름이 글자까지 같아야 묶인다) */
  companies: string[];
  onClose: () => void;
  /** 저장·삭제가 끝난 뒤. 목록을 다시 불러오게 한다 */
  onSaved: () => void;
}

/**
 * 경력 항목 추가·수정 모달.
 *
 * 확인 창은 ion-alert 대신 window.confirm 을 쓴다 — 모달 위에 alert 를 겹치면 포커스가
 * 엉키기 쉽고, 삭제 한 번 묻는 데에는 이걸로 충분하다.
 */
const AdminCareerEditor: React.FC<Props> = ({ target, companies, onClose, onSaved }) => {
  const [form, setForm] = useState<CareerForm>(emptyForm());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const editing = target && 'entry' in target ? target.entry : null;

  // 열릴 때마다 대상으로 폼을 새로 채운다. 닫았다 다른 항목을 열면 이전 입력이 남지 않게
  useEffect(() => {
    if (!target) return;
    setForm('entry' in target ? entryToForm(target.entry) : emptyForm(target.preset));
    setError('');
    setIsSaving(false);
  }, [target]);

  const set = (key: keyof CareerForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    const invalid = validateForm(form);
    if (invalid) {
      setError(invalid);
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const input = formToInput(form);
      if (editing) {
        await updateCareer(editing.id, input);
      } else {
        await createCareer(input);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.');
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !window.confirm(`'${editing.title}' 항목을 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      await deleteCareer(editing.id);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제하지 못했습니다.');
      setIsSaving(false);
    }
  };

  const isCompany = form.entryType === 'company';
  // 저장된 종류가 선택지 밖이면(스킬로 넣은 'language' 등) 그 값도 고를 수 있게 붙인다
  const typeOptions = ENTRY_TYPES.some((t) => t.value === form.entryType) || !form.entryType
    ? ENTRY_TYPES
    : [...ENTRY_TYPES, { value: form.entryType, label: form.entryType }];

  return (
    <IonModal isOpen={target !== null} onDidDismiss={onClose} className="cr-editor-modal">
      <div className="cr-editor">
        <header className="cr-editor-head">
          <h2>{editing ? '경력 수정' : '경력 추가'}</h2>
          <IonButton fill="clear" onClick={onClose} disabled={isSaving}>
            <IonIcon icon={closeOutline} />
          </IonButton>
        </header>

        <div className="cr-editor-body">
          <div className="cr-field-row">
            <label className="cr-field">
              <span>종류</span>
              <select value={form.entryType} onChange={set('entryType')}>
                {typeOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="cr-field">
              <span>회사</span>
              <input
                value={form.company}
                onChange={set('company')}
                list="cr-company-list"
                placeholder={form.entryType === 'project' ? '비우면 개인 프로젝트' : ''}
              />
              <datalist id="cr-company-list">
                {companies.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </label>
          </div>

          <label className="cr-field">
            <span>{isCompany ? '직무' : form.entryType === 'project' ? '프로젝트명' : '제목'} *</span>
            <input value={form.title} onChange={set('title')} />
          </label>

          <div className="cr-field-row">
            <label className="cr-field">
              <span>부서·팀</span>
              <input value={form.team} onChange={set('team')} />
            </label>
            <label className="cr-field">
              <span>{isCompany ? '직급' : '역할'}</span>
              <input value={form.role} onChange={set('role')} />
            </label>
          </div>

          <div className="cr-field-row">
            <label className="cr-field">
              <span>시작</span>
              <input type="month" value={form.startedMonth} onChange={set('startedMonth')} />
            </label>
            <label className="cr-field">
              <span>종료 (비우면 {isCompany ? '재직 중' : '진행 중'})</span>
              <input type="month" value={form.endedMonth} onChange={set('endedMonth')} />
            </label>
          </div>

          <label className="cr-field">
            <span>요약</span>
            <textarea rows={2} value={form.summary} onChange={set('summary')} />
          </label>
          <label className="cr-field">
            <span>상세 내용</span>
            <textarea rows={7} value={form.description} onChange={set('description')} />
          </label>
          <label className="cr-field">
            <span>성과 (한 줄에 하나)</span>
            <textarea rows={3} value={form.achievements} onChange={set('achievements')} />
          </label>

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
            <textarea rows={2} value={form.referenceLinks} onChange={set('referenceLinks')} />
          </label>

        </div>

        {/* 본문은 스크롤되므로 오류를 그 안에 두면 긴 폼에서 화면 밖에 뜬다. 버튼 바로 위에 고정한다 */}
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

export default AdminCareerEditor;
