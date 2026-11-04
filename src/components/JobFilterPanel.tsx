import React from 'react';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { Filters } from '../pages/Home';
import { WelfareCategory } from '../common/companyFeatureApi';

export interface CategoryDtl {
  id: number;
  name: string;
}

export interface CategoryMst {
  id: number;
  name: string;
  categoryDtls: CategoryDtl[];
  visible: boolean;
}

interface JobFilterPanelProps {
  categoriesData: CategoryMst[];
  filters: Filters;
  visibleCategories: Record<string, boolean>;
  onToggleCategory: (title: string) => void;
  onCategoryChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onIncludeNoExperienceChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExperienceInputChange: (event: React.ChangeEvent<HTMLInputElement>, field: 'start' | 'end') => void;
  onExperienceSliderChange: (range: number | number[]) => void;
  welfareCategories: WelfareCategory[];
  onRemoteOnlyChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onWelfareChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onWelfareMatchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** 체크박스 id 가 문서 안에서 겹치지 않게 하는 접두어. PC 사이드바와 모바일 시트가 동시에 마운트될 수 있다. */
  idPrefix?: string;
}

/**
 * 근무형태·직군·경력 필터 패널. PC 에서는 왼쪽 사이드바에, 모바일에서는 필터 버튼으로 여는 바텀 시트에 들어간다.
 * 상태는 Home 이 들고 있고 이 컴포넌트는 그리기만 한다.
 */
const JobFilterPanel: React.FC<JobFilterPanelProps> = ({
  categoriesData,
  filters,
  visibleCategories,
  onToggleCategory,
  onCategoryChange,
  onIncludeNoExperienceChange,
  onExperienceInputChange,
  onExperienceSliderChange,
  welfareCategories,
  onRemoteOnlyChange,
  onWelfareChange,
  onWelfareMatchChange,
  idPrefix = '',
}) => (
  <div className="job-filter-panel">
    {/* 회사 단위 필터. 공고 본문에서 자동으로 찾은 근무형태·복지로 회사 탭을 거른다 */}
    <div className="work-style-section">
      <h2>근무 형태</h2>
      <div className="work-style-option">
        <input
          type="checkbox"
          id={`${idPrefix}remoteOnly`}
          checked={filters.remoteOnly}
          onChange={onRemoteOnlyChange}
        />
        <label htmlFor={`${idPrefix}remoteOnly`}>재택근무 회사만</label>
      </div>
    </div>

    {/* 재택과 따로 고른다. 재택도 켜면 재택 회사 중에서 거른다 */}
    {welfareCategories.length > 0 && (
      <div className="work-style-section">
        <h2>복지</h2>
        <div className="welfare-match" role="radiogroup" aria-label="복지 조건">
          {([
            ['ALL', '모두 있음'],
            ['ANY', '하나라도 있음'],
          ] as const).map(([value, label]) => {
            const inputId = `${idPrefix}welfareMatch-${value}`;
            const selected = filters.welfareMatch === value;
            return (
              <label
                key={value}
                htmlFor={inputId}
                className={`welfare-match__option${selected ? ' is-selected' : ''}`}
              >
                <input
                  type="radio"
                  id={inputId}
                  name={`${idPrefix}welfareMatch`}
                  value={value}
                  checked={selected}
                  onChange={onWelfareMatchChange}
                />
                {label}
              </label>
            );
          })}
        </div>
        <div className="category-list welfare-list" role="group" aria-label="복지">
          {welfareCategories.map((category) => {
            const inputId = `${idPrefix}welfare-${category.code}`;
            return (
              <div key={category.code}>
                <input
                  type="checkbox"
                  id={inputId}
                  value={category.code}
                  checked={filters.welfare.includes(category.code)}
                  onChange={onWelfareChange}
                />
                <label htmlFor={inputId}>{category.name}</label>
              </div>
            );
          })}
        </div>
      </div>
    )}

    <h2>직군</h2>
    <form onSubmit={(e) => e.preventDefault()}>
      {categoriesData.map((categoryData) => {
        const isVisible = visibleCategories[categoryData.name] !== undefined
          ? visibleCategories[categoryData.name]
          : categoryData.visible;
        const filterKey = categoryData.name.toLowerCase();

        return (
          <div key={categoryData.id}>
            <span
              onClick={() => onToggleCategory(categoryData.name)}
              className="category-toggle"
            >
              {categoryData.name}
            </span>
            {isVisible && (
              <div className="category-list">
                {categoryData.categoryDtls.map((categoryDtl) => {
                  const inputId = `${idPrefix}${categoryDtl.name}`;
                  return (
                    <div key={categoryDtl.id}>
                      <input
                        type="checkbox"
                        id={inputId}
                        value={categoryDtl.name}
                        name={filterKey}
                        checked={filters.categories[filterKey]?.includes(categoryDtl.name) || false}
                        onChange={onCategoryChange}
                      />
                      <label htmlFor={inputId}>{categoryDtl.name}</label>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </form>

    <div className="experience-section">
      <div className="experience-header">
        <h2>경력</h2>
        <input
          type="checkbox"
          id={`${idPrefix}includeNoExperience`}
          checked={filters.includeNoExperience}
          onChange={onIncludeNoExperienceChange}
        />
        <label htmlFor={`${idPrefix}includeNoExperience`}>경력 무관 포함</label>
      </div>

      <div>
        <input
          type="number"
          min={0}
          max={filters.personalHistory.end}
          value={filters.personalHistory.start}
          onChange={(e) => onExperienceInputChange(e, 'start')}
          className="experience-input"
          style={{ marginRight: '2px' }}
        />
        년 ~
        <input
          type="number"
          min={filters.personalHistory.start}
          max={10}
          value={filters.personalHistory.end}
          onChange={(e) => onExperienceInputChange(e, 'end')}
          className="experience-input"
          style={{ marginLeft: '2px', marginRight: '5px' }}
        />
        년

        <Slider
          range
          min={0}
          max={10}
          value={[filters.personalHistory.start, filters.personalHistory.end]}
          onChange={onExperienceSliderChange}
          marks={{ 0: '0년', 3: '3년', 5: '5년', 7: '7년', 10: '10년+' }}
          step={1}
          style={{ marginTop: '5px' }}
        />
      </div>
    </div>
  </div>
);

export default JobFilterPanel;
