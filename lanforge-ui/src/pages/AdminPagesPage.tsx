import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faSpinner, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import api from '../utils/api';

interface Page {
  slug: string;
  title: string;
  updatedAt: string;
}

const AdminPagesPage: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedPageSlug, setSelectedPageSlug] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await api.get('/pages');
      if (response.data.pages) {
        setPages(response.data.pages);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPageContent = async (slug: string) => {
    try {
      const response = await api.get(`/pages/${slug}`);
      if (response.data.page) {
        setFormData({ title: response.data.page.title, content: response.data.page.content || '' });
        setSelectedPageSlug(slug);
        setIsPreview(false);
        setMessage({ type: '', text: '' });
      }
    } catch (error) {
      console.error('Error fetching page content:', error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPageSlug) return;

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      const response = await api.put(`/pages/${selectedPageSlug}`, formData);

      if (response.data.page) {
        setMessage({ type: 'success', text: 'Page updated successfully!' });
        fetchPages(); // Refresh the list to get updated dates
      }
    } catch (error: any) {
      console.error('Error saving page:', error);
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update page' });
    } finally {
      setSaving(false);
    }
  };

  const predefinedPages = [
    { slug: 'warranty', label: 'Warranty Policy' },
    { slug: 'tos', label: 'Terms of Service' },
    { slug: 'privacy-policy', label: 'Privacy Policy' },
    { slug: 'cookie-policy', label: 'Cookie Policy' },
    { slug: 'shipping-returns', label: 'Shipping & Returns' }
  ];

  const handleCreateNewOrSelect = (slug: string, label: string) => {
    // If it exists in the list, load it
    const existing = pages.find(p => p.slug === slug);
    if (existing) {
      loadPageContent(slug);
    } else {
      // Otherwise set up empty form for it
      setFormData({ title: label, content: '' });
      setSelectedPageSlug(slug);
      setIsPreview(false);
      setMessage({ type: '', text: '' });
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
        {/* Sidebar for selecting pages */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Pages</h2>
            
            {loading ? (
              <div className="flex justify-center p-4">
                <FontAwesomeIcon icon={faSpinner} spin className="text-emerald-500 text-xl" />
              </div>
            ) : (
              <ul className="space-y-2">
                {predefinedPages.map(page => {
                  const exists = pages.find(p => p.slug === page.slug);
                  return (
                    <li key={page.slug}>
                      <button
                        onClick={() => handleCreateNewOrSelect(page.slug, page.label)}
                        className={`w-full text-left px-3 py-2 rounded-md transition-colors flex justify-between items-center ${
                          selectedPageSlug === page.slug
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                            : 'hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        <span>{page.label}</span>
                        {exists ? (
                          <FontAwesomeIcon icon={faCheck} className="text-emerald-500 text-xs" />
                        ) : (
                          <FontAwesomeIcon icon={faTimes} className="text-gray-500 text-xs" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-2">
                <FontAwesomeIcon icon={faCheck} className="text-emerald-500 mr-1" /> = Has content
              </p>
              <p className="text-xs text-gray-400">
                <FontAwesomeIcon icon={faTimes} className="text-gray-500 mr-1" /> = Empty/Default
              </p>
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-grow">
          {selectedPageSlug ? (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Edit Content</h2>
                <div className="flex bg-gray-900 rounded-md p-1 border border-gray-700">
                  <button
                    onClick={() => setIsPreview(false)}
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                      !isPreview ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Write (Markdown)
                  </button>
                  <button
                    onClick={() => setIsPreview(true)}
                    className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                      isPreview ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {message.text && (
                <div className={`p-4 mb-6 rounded-md ${
                  message.type === 'success' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800' : 'bg-red-900/30 text-red-400 border border-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSave}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-400 mb-1">Page Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Content <span className="text-xs text-gray-500 font-normal">(Markdown supported)</span>
                  </label>
                  
                  {isPreview ? (
                    <div className="w-full min-h-[400px] bg-gray-900 border border-gray-700 rounded-md p-6 overflow-y-auto prose prose-invert max-w-4xl mx-auto text-left text-gray-300 prose-headings:text-white prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-a:text-emerald-400 hover:prose-a:text-emerald-300 prose-strong:text-white prose-ul:list-disc prose-ol:list-decimal prose-li:my-1">
                      {formData.content ? (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkBreaks]} 
                          rehypePlugins={[rehypeRaw]}
                        >
                          {formData.content}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-gray-500 italic">Nothing to preview</p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full min-h-[400px] bg-gray-900 border border-gray-700 rounded-md px-4 py-4 text-white focus:outline-none focus:border-emerald-500 font-mono text-sm"
                      placeholder="# Heading&#10;&#10;Write your content here using Markdown..."
                      required
                    />
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                  >
                    {saving ? (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                      <FontAwesomeIcon icon={faSave} />
                    )}
                    {saving ? 'Saving...' : 'Save Page Content'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg p-10 border border-gray-700 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <FontAwesomeIcon icon={faSave} size="xl" />
              </div>
              <h2 className="text-xl font-bold mb-2">Select a Page to Edit</h2>
              <p className="text-gray-400 max-w-md">
                Choose a page from the sidebar to edit its content. You can write content using Markdown format and preview it before saving.
              </p>
            </div>
          )}
        </div>
      </div>
  );
};

export default AdminPagesPage;
