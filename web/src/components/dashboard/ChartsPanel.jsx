/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useState, useMemo, useCallback } from 'react';
import { Card, Tabs, TabPane, Table, ButtonGroup, Button } from '@douyinfe/semi-ui';
import { PieChart, BarChart3, TableProperties } from 'lucide-react';
import { VChart } from '@visactor/react-vchart';
import { renderQuota, renderNumber } from '../../helpers';
import { STORAGE_KEYS } from '../../constants/dashboard.constants';

const getInitialViewMode = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.DASHBOARD_VIEW_MODE) || 'chart';
  } catch {
    return 'chart';
  }
};

const ChartsPanel = ({
  activeChartTab,
  setActiveChartTab,
  spec_line,
  spec_model_line,
  spec_pie,
  spec_rank_bar,
  spec_user_rank,
  spec_user_trend,
  spec_token_bar,
  spec_user_token_rank,
  spec_user_model_bar,
  isAdminUser,
  CARD_PROPS,
  CHART_CONFIG,
  FLEX_CENTER_GAP2,
  hasApiInfoPanel,
  t,
}) => {
  const [viewMode, setViewMode] = useState(getInitialViewMode);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.DASHBOARD_VIEW_MODE, mode);
    } catch { /* ignore */ }
  }, []);

  const getSpecData = useCallback((spec) => {
    return spec?.data?.[0]?.values || [];
  }, []);

  // ========== 表格列定义 ==========

  const columnsTab1 = useMemo(() => [
    { title: t('时间'), dataIndex: 'Time', sorter: (a, b) => a.Time.localeCompare(b.Time) },
    { title: t('模型'), dataIndex: 'Model' },
    {
      title: t('额度消耗'),
      dataIndex: 'rawQuota',
      sorter: (a, b) => a.rawQuota - b.rawQuota,
      render: (text) => renderQuota(text, 4),
      defaultSortOrder: 'descend',
    },
  ], [t]);

  const columnsTab2 = useMemo(() => [
    { title: t('时间'), dataIndex: 'Time', sorter: (a, b) => a.Time.localeCompare(b.Time) },
    { title: t('模型'), dataIndex: 'Model' },
    {
      title: t('调用次数'),
      dataIndex: 'Count',
      sorter: (a, b) => a.Count - b.Count,
      render: (text) => renderNumber(text),
      defaultSortOrder: 'descend',
    },
  ], [t]);

  const dataTab3 = useMemo(() => {
    const raw = getSpecData(spec_pie);
    const total = raw.reduce((sum, item) => sum + (item.value || 0), 0);
    return raw.map((item) => ({
      ...item,
      percent: total > 0 ? ((item.value / total) * 100).toFixed(2) + '%' : '0%',
    }));
  }, [spec_pie, getSpecData]);

  const columnsTab3 = useMemo(() => [
    { title: t('模型'), dataIndex: 'type' },
    {
      title: t('调用次数'),
      dataIndex: 'value',
      sorter: (a, b) => a.value - b.value,
      render: (text) => renderNumber(text),
      defaultSortOrder: 'descend',
    },
    { title: t('占比'), dataIndex: 'percent' },
  ], [t]);

  const columnsTab4 = useMemo(() => [
    { title: t('模型'), dataIndex: 'Model' },
    {
      title: t('调用次数'),
      dataIndex: 'Count',
      sorter: (a, b) => a.Count - b.Count,
      render: (text) => renderNumber(text),
      defaultSortOrder: 'descend',
    },
  ], [t]);

  const columnsTab7 = useMemo(() => [
    { title: t('Token 名称'), dataIndex: 'TokenName' },
    { title: t('模型'), dataIndex: 'Model' },
    {
      title: t('额度消耗'),
      dataIndex: 'rawQuota',
      sorter: (a, b) => a.rawQuota - b.rawQuota,
      render: (text) => renderQuota(text, 4),
      defaultSortOrder: 'descend',
    },
    {
      title: t('调用次数'),
      dataIndex: 'count',
      sorter: (a, b) => a.count - b.count,
      render: (text) => renderNumber(text),
    },
  ], [t]);

  const columnsTab5 = useMemo(() => [
    { title: t('用户'), dataIndex: 'User' },
    {
      title: t('额度消耗'),
      dataIndex: 'rawQuota',
      sorter: (a, b) => a.rawQuota - b.rawQuota,
      render: (text) => renderQuota(text, 4),
      defaultSortOrder: 'descend',
    },
  ], [t]);

  const columnsTab6 = useMemo(() => [
    { title: t('时间'), dataIndex: 'Time', sorter: (a, b) => a.Time.localeCompare(b.Time) },
    { title: t('用户'), dataIndex: 'User' },
    {
      title: t('额度消耗'),
      dataIndex: 'rawQuota',
      sorter: (a, b) => a.rawQuota - b.rawQuota,
      render: (text) => renderQuota(text, 4),
      defaultSortOrder: 'descend',
    },
  ], [t]);

  const columnsTab8 = useMemo(() => [
    { title: t('用户'), dataIndex: 'User' },
    {
      title: t('Token 消耗'),
      dataIndex: 'TokenUsed',
      sorter: (a, b) => a.TokenUsed - b.TokenUsed,
      render: (text) => renderNumber(text),
      defaultSortOrder: 'descend',
    },
  ], [t]);

  const columnsTab9 = useMemo(() => [
    { title: t('用户'), dataIndex: 'User' },
    { title: t('模型'), dataIndex: 'Model' },
    {
      title: t('额度消耗'),
      dataIndex: 'rawQuota',
      sorter: (a, b) => a.rawQuota - b.rawQuota,
      render: (text) => renderQuota(text, 4),
      defaultSortOrder: 'descend',
    },
    {
      title: t('Token 消耗'),
      dataIndex: 'TokenUsed',
      sorter: (a, b) => a.TokenUsed - b.TokenUsed,
      render: (text) => renderNumber(text),
    },
    {
      title: t('调用次数'),
      dataIndex: 'Count',
      sorter: (a, b) => a.Count - b.Count,
      render: (text) => renderNumber(text),
    },
  ], [t]);

  const tableProps = {
    size: 'small',
    pagination: { pageSize: 10, showTotal: true },
  };

  const renderTable = (columns, data) => (
    <div className='h-96 overflow-auto p-2'>
      <Table columns={columns} dataSource={data} {...tableProps} />
    </div>
  );

  const renderContent = () => {
    if (viewMode === 'chart') {
      return (
        <div className='h-96 p-2'>
          {activeChartTab === '1' && <VChart spec={spec_line} option={CHART_CONFIG} />}
          {activeChartTab === '2' && <VChart spec={spec_model_line} option={CHART_CONFIG} />}
          {activeChartTab === '3' && <VChart spec={spec_pie} option={CHART_CONFIG} />}
          {activeChartTab === '4' && <VChart spec={spec_rank_bar} option={CHART_CONFIG} />}
          {activeChartTab === '7' && <VChart spec={spec_token_bar} option={CHART_CONFIG} />}
          {activeChartTab === '5' && isAdminUser && <VChart spec={spec_user_rank} option={CHART_CONFIG} />}
          {activeChartTab === '6' && isAdminUser && <VChart spec={spec_user_trend} option={CHART_CONFIG} />}
          {activeChartTab === '8' && isAdminUser && <VChart spec={spec_user_token_rank} option={CHART_CONFIG} />}
          {activeChartTab === '9' && isAdminUser && <VChart spec={spec_user_model_bar} option={CHART_CONFIG} />}
        </div>
      );
    }

    return (
      <>
        {activeChartTab === '1' && renderTable(columnsTab1, getSpecData(spec_line))}
        {activeChartTab === '2' && renderTable(columnsTab2, getSpecData(spec_model_line))}
        {activeChartTab === '3' && renderTable(columnsTab3, dataTab3)}
        {activeChartTab === '4' && renderTable(columnsTab4, getSpecData(spec_rank_bar))}
        {activeChartTab === '7' && renderTable(columnsTab7, getSpecData(spec_token_bar))}
        {activeChartTab === '5' && isAdminUser && renderTable(columnsTab5, getSpecData(spec_user_rank))}
        {activeChartTab === '6' && isAdminUser && renderTable(columnsTab6, getSpecData(spec_user_trend))}
        {activeChartTab === '8' && isAdminUser && renderTable(columnsTab8, getSpecData(spec_user_token_rank))}
        {activeChartTab === '9' && isAdminUser && renderTable(columnsTab9, getSpecData(spec_user_model_bar))}
      </>
    );
  };

  return (
    <Card
      {...CARD_PROPS}
      className={`!rounded-2xl ${hasApiInfoPanel ? 'lg:col-span-3' : ''}`}
      title={
        <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between w-full gap-3'>
          <div className={FLEX_CENTER_GAP2}>
            <PieChart size={16} />
            {t('数据统计')}
          </div>
          <div className='flex items-center gap-3'>
            <Tabs
              type='slash'
              activeKey={activeChartTab}
              onChange={setActiveChartTab}
            >
              <TabPane tab={<span>{t('消耗分布')}</span>} itemKey='1' />
              <TabPane tab={<span>{t('调用趋势')}</span>} itemKey='2' />
              <TabPane tab={<span>{t('调用次数分布')}</span>} itemKey='3' />
              <TabPane tab={<span>{t('调用次数排行')}</span>} itemKey='4' />
              <TabPane tab={<span>{t('API Key 统计')}</span>} itemKey='7' />
              {isAdminUser && (
                <TabPane tab={<span>{t('用户消耗排行')}</span>} itemKey='5' />
              )}
              {isAdminUser && (
                <TabPane tab={<span>{t('用户消耗趋势')}</span>} itemKey='6' />
              )}
              {isAdminUser && (
                <TabPane tab={<span>{t('用户 Token 排行')}</span>} itemKey='8' />
              )}
              {isAdminUser && (
                <TabPane tab={<span>{t('用户模型消耗分布')}</span>} itemKey='9' />
              )}
            </Tabs>
            <ButtonGroup size='small'>
              <Button
                theme={viewMode === 'chart' ? 'solid' : 'light'}
                icon={<BarChart3 size={14} />}
                onClick={() => handleViewModeChange('chart')}
              />
              <Button
                theme={viewMode === 'table' ? 'solid' : 'light'}
                icon={<TableProperties size={14} />}
                onClick={() => handleViewModeChange('table')}
              />
            </ButtonGroup>
          </div>
        </div>
      }
      bodyStyle={{ padding: 0 }}
    >
      {renderContent()}
    </Card>
  );
};

export default ChartsPanel;
