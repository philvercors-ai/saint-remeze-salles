import django_mongodb_backend.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserGroup',
            fields=[
                ('id', django_mongodb_backend.fields.ObjectIdAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100, unique=True, verbose_name='Nom')),
                ('description', models.TextField(blank=True, verbose_name='Description')),
            ],
            options={
                'verbose_name': "Groupe d'utilisateurs",
                'verbose_name_plural': "Groupes d'utilisateurs",
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='customuser',
            name='reservation_groups',
            field=models.ManyToManyField(blank=True, related_name='members', to='accounts.usergroup', verbose_name='Groupes de réservation'),
        ),
    ]
