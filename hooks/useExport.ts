import { useToast } from "@/components/toast";

interface ExportOptions {
  companies?: any[];
  columns?: 'default' | 'minimal' | 'extended';
  filename?: string;
}

export function useExport() {
  const { addToast } = useToast();

  const exportToCSV = async (options: ExportOptions) => {
    try {
      const { companies = [], columns = 'default', filename } = options;

      if (!companies || companies.length === 0) {
        addToast('Aucune donnée à exporter', 'warning');
        return;
      }

      // Limit to 500 companies as per API limit
      const companiesToExport = companies.slice(0, 500);
      
      if (companies.length > 500) {
        addToast(`Seules les 500 premières entreprises seront exportées (limite de l'API)`, 'info');
      }

      const response = await fetch('/api/export/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companies: companiesToExport,
          columns,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'export');
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let exportFilename = filename;
      
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          exportFilename = match[1];
        }
      }

      if (!exportFilename) {
        exportFilename = `entreprises_export_${new Date().toISOString().slice(0, 10)}.csv`;
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      addToast(`Export réussi ! ${companiesToExport.length} entreprises exportées en CSV`, 'success');

    } catch (error) {
      console.error('Export error:', error);
      addToast(
        error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'export',
        'error'
      );
    }
  };

  const exportSingleCompany = async (siren: string) => {
    try {
      const response = await fetch(`/api/export/csv?siren=${siren}`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `entreprise_${siren}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      addToast('Fiche entreprise exportée en CSV', 'success');

    } catch (error) {
      console.error('Single export error:', error);
      addToast('Erreur lors de l\'export de la fiche entreprise', 'error');
    }
  };

  return {
    exportToCSV,
    exportSingleCompany,
  };
}