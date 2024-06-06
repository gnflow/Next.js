'use server';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce.number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.',
    }),
    date: z.string(),
  });
   
const CreateInvoice = FormSchema.omit({ id: true, date: true });
// This is temporary until @types/react-dom is updated
export type InvoiceState = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
// This is temporary until @types/react-dom is updated
export type State = {
  errors?: {
    id?: string[];
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
export async function createInvoice(prevState: InvoiceState, formData: FormData) {
  //   const rawFormData = {
  //     customerId: formData.get('customerId'),
  //     amount: formData.get('amount'),
  //     status: formData.get('status'),
  //   };
  // Test it out:
  // console.log(rawFormData);
  // console.log(typeof rawFormData.amount);
  // Validate form fields using Zod by transforming .parse into .safeParse
  // const { customerId, amount, status } 
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    // console.log(`:::: validatedFields result:`,validatedFields);
    
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  const { customerId, amount, status } = validatedFields.data;
  // console.log(`:::: validatedFields result:`,validatedFields);

  // It's usually good practice to store monetary values in cents in your database 
  // to eliminate JavaScript floating-point errors and ensure greater accuracy.
  // Let's convert amount into cents..
    const amountInCents = amount * 100;
  // create a new date with the format "YYYY-MM-DD" for the invoice's creation date
  const date = new Date().toISOString().split('T')[0];

  const rawFormData = {
      customerId,
      amountInCents,
      status,
      date
  };

  console.log(rawFormData);
  
  try{
    await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
      
  }catch(error){
    console.log(error);
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');  
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
// prevState prop before formData
 
export async function updateInvoice(id: string, prevState: InvoiceState, formData: FormData) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    // console.log(`:::: validatedFields result:`,validatedFields);
    
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }
  const { customerId, amount, status } = validatedFields.data;
  // console.log(`:::: validatedFields result:`,validatedFields)
 
  const amountInCents = amount * 100;

  try{
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
    `;
  }catch(error){
    console.log(error);
    return {
      message: 'Database Error: Failed to Update Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  //throw new Error('ERROR FAKED - Failed to Delete Invoice');
  try{
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
  }catch(error){
    console.log(error);
    return {
      message: 'Database Error: Failed to Delete Invoice.',
    };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}