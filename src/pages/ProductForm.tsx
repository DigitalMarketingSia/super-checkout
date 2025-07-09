
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ProductImageUpload } from '@/components/ProductImageUpload';
import { useProductContext } from '@/context/ProductContext';
import { toast } from '@/hooks/use-toast';

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  type: z.enum(['main', 'bump'], { required_error: 'Tipo do produto é obrigatório' }),
  category: z.string().optional(),
  originalPrice: z.number().optional(),
  price: z.number().min(0, 'Preço deve ser maior que zero'),
  code: z.string().optional(),
  redirectUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  image: z.string().optional(),
  hasUpsell: z.boolean().default(false),
  hasOrderBump: z.boolean().default(false),
  isActive: z.boolean().default(true)
});

type ProductFormData = z.infer<typeof productSchema>;

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [loading, setLoading] = useState(false);
  const { addProduct, updateProduct, getProductById } = useProductContext();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      type: 'main',
      category: '',
      originalPrice: undefined,
      price: 0,
      code: '',
      redirectUrl: '',
      description: '',
      image: '',
      hasUpsell: false,
      hasOrderBump: false,
      isActive: true
    }
  });

  useEffect(() => {
    if (isEditing && id) {
      const product = getProductById(id);
      if (product) {
        form.reset({
          name: product.name,
          type: product.type || 'main',
          category: product.category || '',
          originalPrice: product.originalPrice,
          price: product.price,
          code: product.code || '',
          redirectUrl: product.redirectUrl || '',
          description: product.description || '',
          image: product.image || '',
          hasUpsell: product.hasUpsell || false,
          hasOrderBump: product.hasOrderBump || false,
          isActive: product.isActive !== false
        });
      }
    }
  }, [id, isEditing, form, getProductById]);

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    try {
      const productData = {
        name: data.name,
        price: data.price,
        type: data.type,
        category: data.category,
        originalPrice: data.originalPrice,
        code: data.code,
        redirectUrl: data.redirectUrl,
        description: data.description,
        image: data.image,
        hasUpsell: data.hasUpsell,
        hasOrderBump: data.hasOrderBump,
        isActive: data.isActive
      };

      if (isEditing && id) {
        await updateProduct(id, productData);
        toast({
          title: "Produto atualizado!",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        await addProduct(productData);
        toast({
          title: "Produto criado!",
          description: "O produto foi criado com sucesso.",
        });
      }
      
      navigate('/products');
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o produto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (imageUrl: string | null) => {
    form.setValue('image', imageUrl || '');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <p className="text-gray-400">
            {isEditing ? 'Atualize as informações do produto' : 'Cadastre um novo produto em seu catálogo'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna da Imagem */}
          <div className="lg:col-span-1">
            <ProductImageUpload 
              imageUrl={form.watch('image')}
              onImageChange={handleImageChange}
            />
          </div>

          {/* Coluna do Formulário com Efeito Glassmorphism */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-lg bg-gradient-to-b from-purple-500/10 to-transparent p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white">Informações do Produto</h2>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Nome do Produto *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Curso Completo de Marketing Digital" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Novo campo para tipo de produto */}
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel className="text-gray-300">Tipo de Produto *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="space-y-3"
                          >
                            <div className="flex items-center space-x-3 bg-gray-700 p-4 rounded-lg">
                              <RadioGroupItem value="main" id="main" />
                              <Label htmlFor="main" className="text-white cursor-pointer flex-1">
                                <div>
                                  <div className="font-medium">Produto Principal</div>
                                  <div className="text-sm text-gray-400">Este é o produto principal que será vendido no checkout</div>
                                </div>
                              </Label>
                            </div>
                            <div className="flex items-center space-x-3 bg-gray-700 p-4 rounded-lg">
                              <RadioGroupItem value="bump" id="bump" />
                              <Label htmlFor="bump" className="text-white cursor-pointer flex-1">
                                <div>
                                  <div className="font-medium">Order Bump</div>
                                  <div className="text-sm text-gray-400">Este produto será oferecido como uma oferta adicional durante o checkout</div>
                                </div>
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Categoria</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Educação, Consultoria, Software..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="originalPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">De: R$ (Valor Original)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="597.00" 
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Por: R$ (Valor Atual) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="497.00" 
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Código do Produto</FormLabel>
                          <FormControl>
                            <Input placeholder="CURSO-001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="redirectUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Link de Redirecionamento</FormLabel>
                          <FormControl>
                            <Input placeholder="https://exemplo.com/obrigado" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Descrição</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva seu produto em detalhes..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="hasUpsell"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel className="text-gray-300">Ativar Upsell</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hasOrderBump"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel className="text-gray-300">Ativar Order Bump</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel className="text-gray-300">Produto Ativo</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      {loading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Produto')}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => navigate('/products')}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProductForm;
